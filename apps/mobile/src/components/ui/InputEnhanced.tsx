import React, { useState, useRef } from 'react';
import { TextInput as RNTextInput, View, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
  maxLength?: number;
}

export function Input({
  label,
  placeholder,
  value = '',
  onChangeText,
  helperText,
  errorText,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  showClearButton = false,
  onClear,
  autoFocus = false,
  maxLength,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const inputRef = useRef<RNTextInput>(null);

  const hasError = !!errorText;

  return (
    <YStack gap={8} opacity={disabled ? 0.5 : 1}>
      {label && (
        <Text
          fontSize={13}
          fontWeight="700"
          color={C['text/secondary']}
          letterSpacing={0.2}
          textTransform="uppercase"
        >
          {label}
        </Text>
      )}

      <XStack
        alignItems={multiline ? 'flex-start' : 'center'}
        paddingVertical={multiline ? 12 : 0}
        paddingHorizontal={18}
        borderRadius={12}
        borderWidth={1.5}
        borderColor={
          hasError ? C['status/urgent'] : isFocused ? C['brand/primary'] : C['border/subtle']
        }
        backgroundColor={C['surface/raised']}
        {...(isFocused && {
          shadowColor: C['brand/primary'],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
          elevation: 2,
        })}
        {...(hasError && {
          shadowColor: C['status/urgent'],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 1,
        })}
      >
        <RNTextInput
          ref={inputRef}
          style={{
            flex: 1,
            fontSize: 17,
            color: C['text/primary'],
            fontFamily: 'Inter',
            paddingVertical: multiline ? 4 : 16,
            borderWidth: 0,
            padding: 0,
            margin: 0,
          }}
          placeholder={placeholder}
          placeholderTextColor={C['text/tertiary']}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={isSecure}
          autoFocus={autoFocus}
          maxLength={maxLength}
        />

        {secureTextEntry && (
          <Pressable onPress={() => setIsSecure(!isSecure)} hitSlop={8}>
            {isSecure ? (
              <Eye size={18} color={C['text/secondary']} strokeWidth={2} />
            ) : (
              <EyeOff size={18} color={C['text/secondary']} strokeWidth={2} />
            )}
          </Pressable>
        )}

        {showClearButton && value && !disabled && (
          <Pressable
            onPress={() => {
              onChangeText?.('');
              onClear?.();
              inputRef.current?.focus();
            }}
            hitSlop={8}
          >
            <X size={18} color={C['text/secondary']} strokeWidth={2.5} />
          </Pressable>
        )}
      </XStack>

      {(helperText || errorText) && (
        <Text
          fontSize={12}
          color={hasError ? C['status/urgent'] : C['text/tertiary']}
          marginTop={-4}
        >
          {errorText || helperText}
        </Text>
      )}
    </YStack>
  );
}
