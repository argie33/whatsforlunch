import React, { useState } from 'react';
import { YStack, XStack, TextInput, Text, Pressable } from 'tamagui';
import { Icon } from './Icon';

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  variant?: 'text' | 'numeric' | 'email' | 'date';
  clearable?: boolean;
  disabled?: boolean;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  variant = 'text',
  clearable = false,
  disabled = false,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const keyboardType = {
    text: 'default',
    numeric: 'number-pad',
    email: 'email-address',
    date: 'default',
  }[variant];

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$4" fontWeight="600" color="$text/primary">
          {label}
        </Text>
      )}
      <XStack
        borderRadius="$md"
        backgroundColor={isFocused ? '$surface/raised' : '$surface/sunken'}
        borderWidth={1}
        borderColor={error ? '$status/urgent' : isFocused ? '$border/strong' : '$border/subtle'}
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
      >
        <TextInput
          flex={1}
          fontSize="$4"
          color="$text/primary"
          placeholderTextColor="$text/tertiary"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          keyboardType={keyboardType as any}
          style={{ padding: 0, margin: 0 }}
        />
        {clearable && value && !disabled && (
          <Pressable
            onPress={() => onChangeText?.('')}
            paddingLeft="$2"
          >
            <Icon name="x" size={20} color="$text/tertiary" />
          </Pressable>
        )}
      </XStack>
      {error && (
        <Text fontSize="$3" color="$status/urgent">
          {error}
        </Text>
      )}
    </YStack>
  );
}
