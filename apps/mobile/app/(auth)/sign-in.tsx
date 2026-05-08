import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn, signInWithApple, signInWithGoogle } from '@/features/auth/authService';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('hello@whatsforlunch.app');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendLink = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim());
      setSent(true);
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleAppleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  if (sent) {
    return (
      <LinearGradient colors={[C['surface/base'], C['surface/base']]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          <YStack alignItems="center" gap={30}>
            <Text fontSize={80} marginBottom={6}>
              📬
            </Text>
            <YStack alignItems="center" gap={14}>
              <Text
                fontSize={28}
                fontWeight="800"
                color={C['text/primary']}
                letterSpacing={-0.8}
                fontFamily="Fraunces"
              >
                Check your email
              </Text>
              <YStack alignItems="center" gap={4}>
                <Text fontSize={16} color={C['text/secondary']} textAlign="center">
                  We sent a magic link to
                </Text>
                <Text fontSize={16} fontWeight="700" color={C['brand/primary']} textAlign="center">
                  {email}
                </Text>
                <Text fontSize={16} color={C['text/secondary']} textAlign="center" marginTop={4}>
                  Tap the link to sign in.
                </Text>
              </YStack>
            </YStack>
            <YStack gap={8} style={{ width: '100%', maxWidth: 280 }}>
              <Pressable
                onPress={() => {
                  /* Open inbox - would open email app */
                }}
                style={{
                  backgroundColor: C['brand/primary'],
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                }}
              >
                <Text fontSize={16} fontWeight="700" color="white">
                  Open inbox
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSent(false)}
                style={{
                  backgroundColor: C['surface/raised'],
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: C['border/subtle'],
                }}
              >
                <Text fontSize={16} fontWeight="700" color={C['brand/primary']}>
                  Use a different email
                </Text>
              </Pressable>
            </YStack>
          </YStack>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[C['brand/tint'], C['surface/base']]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* === Brand Section === */}
          <YStack alignItems="center" marginBottom={48} gap={8}>
            <Text fontSize={64} marginBottom={12}>
              🥬
            </Text>
            <Text
              fontSize={38}
              fontWeight="800"
              color={C['brand/primary']}
              letterSpacing={-1.2}
              fontFamily="Fraunces"
              marginBottom={8}
            >
              WhatsFresh
            </Text>
            <Text fontSize={16} color={C['text/secondary']} textAlign="center" lineHeight={21}>
              Track what's fresh. Reduce waste. Cook smart. Every day.
            </Text>
          </YStack>

          {/* === Auth Form === */}
          <YStack gap={12}>
            {/* Apple Button */}
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={loading}
                style={{
                  backgroundColor: '#000',
                  borderRadius: 16,
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <Text fontSize={17} fontWeight="700" color="white">
                  Continue with Apple
                </Text>
              </Pressable>
            )}

            {/* Google Button */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 24,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: C['border/subtle'],
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text fontSize={17} fontWeight="700" color={C['text/primary']}>
                🔍 &nbsp; Continue with Google
              </Text>
            </Pressable>

            {/* Divider */}
            <XStack alignItems="center" gap={12} marginVertical={24}>
              <View style={{ flex: 1, height: 1, backgroundColor: C['border/subtle'] }} />
              <Text fontSize={12} fontWeight="600" color={C['text/tertiary']} letterSpacing={0.5}>
                or with email
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C['border/subtle'] }} />
            </XStack>

            {/* Email Input */}
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: C['border/subtle'],
                paddingHorizontal: 18,
                paddingVertical: 16,
              }}
            >
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={C['text/tertiary']}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={{
                  fontSize: 17,
                  color: C['text/primary'],
                }}
              />
            </View>

            {/* Send Magic Link Button */}
            <Pressable
              onPress={handleSendLink}
              disabled={loading}
              style={{
                backgroundColor: C['brand/primary'],
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 24,
                alignItems: 'center',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text fontSize={17} fontWeight="700" color="white">
                {loading ? 'Sending...' : 'Send magic link →'}
              </Text>
            </Pressable>
          </YStack>

          {/* === Terms & Privacy === */}
          <YStack alignItems="center" marginTop={32} gap={0}>
            <Text fontSize={12} color={C['text/secondary']} textAlign="center" lineHeight={18}>
              By continuing you agree to our
            </Text>
            <XStack gap={4} justifyContent="center">
              <Text fontSize={12} fontWeight="700" color={C['brand/primary']}>
                Terms
              </Text>
              <Text fontSize={12} color={C['text/secondary']}>
                and
              </Text>
              <Text fontSize={12} fontWeight="700" color={C['brand/primary']}>
                Privacy
              </Text>
            </XStack>
          </YStack>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
