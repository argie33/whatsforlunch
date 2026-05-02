import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';

const SimpleApp = () => {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('test@dev');
  const [token, setToken] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      // Step 1: Sign in
      const signInRes = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { signIn(email: "${email}") { token userId } }`,
        }),
      });
      const signInData = await signInRes.json();
      if (!signInData.data?.signIn?.token) {
        Alert.alert('Error', JSON.stringify(signInData.errors || 'Sign-in failed'));
        setLoading(false);
        return;
      }

      const token = signInData.data.signIn.token;

      // Step 2: Get household ID from profile
      const profileRes = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `{ getProfile { defaultHouseholdId } }`,
        }),
      });
      const profileData = await profileRes.json();
      const householdId = profileData.data?.getProfile?.defaultHouseholdId;

      if (!householdId) {
        Alert.alert('Error', 'Could not get household ID');
        setLoading(false);
        return;
      }

      // Store for later use
      setToken(token);
      setHouseholdId(householdId);
      setScreen('dashboard');
      loadItems(token, householdId);
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (tok, hhId) => {
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({
          query: `query { listItems(householdId: "${hhId}") { id foodName storageLocation expiryAt } }`,
        }),
      });
      const data = await res.json();
      if (data.errors) {
        console.error('GraphQL error:', data.errors);
        Alert.alert('Error loading items', JSON.stringify(data.errors));
      } else {
        setItems(data.data?.listItems || []);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', String(err));
    }
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `mutation {
            createItem(input: {
              householdId: "${householdId}"
              foodName: "${newItem}"
              storageLocation: fridge
              category: dairy
              expiryAt: "2025-12-31T00:00:00Z"
              foodType: "food"
              expirySource: user
            }) { id foodName storageLocation }
          }`,
        }),
      });
      const data = await res.json();
      if (data.data?.createItem) {
        setItems([...items, data.data.createItem]);
        setNewItem('');
        Alert.alert('Success', 'Item added!');
      }
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setToken('');
    setHouseholdId('');
    setEmail('test@dev');
    setItems([]);
    setScreen('login');
  };

  if (screen === 'login') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🍱 What's For Lunch</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
        <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <ScrollView style={styles.itemList}>
        {items.map((item) => (
          <View key={item.id} style={styles.item}>
            <Text style={styles.itemName}>{item.foodName}</Text>
            <Text style={styles.itemLocation}>📍 {item.storageLocation}</Text>
          </View>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        placeholder="Add item..."
        value={newItem}
        onChangeText={setNewItem}
      />
      <TouchableOpacity style={styles.button} onPress={handleAddItem} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Item'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  signOutButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemList: {
    flex: 1,
    marginBottom: 20,
  },
  item: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default SimpleApp;
