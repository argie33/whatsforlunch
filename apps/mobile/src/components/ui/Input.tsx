import React, { useState } from 'react';
import { TextInput, Pressable } from 'react-native';
import type { TextInputProps } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
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
  accessibilityHint,
  ...rest
}: InputProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  const variantKeyboard = {
    text: 'default',
    numeric: 'number-pad',
    email: 'email-address',
    date: 'default',
  }[variant] as TextInputProps['keyboardType'];

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize={14} fontWeight="600" color="$text/primary">
          {label}
        </Text>
      )}
      <XStack
        borderRadius={8}
        backgroundColor="$surface/raised"
        borderWidth={1}
        borderColor={error ? '$status/urgent' : isFocused ? '$brand/primary' : '$border/subtle'}
        paddingHorizontal={12}
        paddingVertical={12}
        alignItems="center"
      >
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          editable={!disabled}
          keyboardType={rest.keyboardType ?? variantKeyboard}
          style={{ padding: 0, margin: 0, flex: 1, fontSize: 16 }}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint || error}
          accessibilityState={{ disabled }}
          {...rest}
        />
        {clearable && value && !disabled && (
          <Pressable
            onPress={() => onChangeText?.('')}
            style={{ paddingLeft: 8 }}
            accessibilityLabel={t('accessibility.clearInput')}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="x" size={16} color="$text/tertiary" />
          </Pressable>
        )}
      </XStack>
      {error && (
        <Text fontSize={12} color="$status/urgent">
          {error}
        </Text>
      )}
    </YStack>
  );
}
