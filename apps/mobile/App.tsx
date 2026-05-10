import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6EE',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F1A11',
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splash: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    fontSize: 64,
    marginBottom: 20,
  },
  splashName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0E5C3A',
    marginBottom: 8,
  },
  splashTag: {
    fontSize: 14,
    color: '#4D5A4F',
  },
});

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        <View style={styles.splash}>
          <Text style={styles.splashLogo}>🥬</Text>
          <Text style={styles.splashName}>WhatsFresh</Text>
          <Text style={styles.splashTag}>Fresh ideas. Less waste.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
