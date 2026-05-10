import React, { useRef, useState } from 'react';
import { Pressable, TextInput as RNTextInput } from 'react-native';
import { Text, XStack } from 'tamagui';
import { X } from 'lucide-react-native';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  size?: 'sm' | 'md';
}

export function SearchBar({
  placeholder = 'Search items...',
  value = '',
  onChangeText,
  onClear,
  onFocus,
  onBlur,
  disabled = false,
  autoFocus = false,
  size = 'md',
}: SearchBarProps) {
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  const sizeMap = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 14 },
    md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 15 },
  };

  const sizeStyle = sizeMap[size];

  return (
    <XStack paddingHorizontal={22} paddingVertical={14}>
      <XStack
        flex={1}
        alignItems="center"
        gap={10}
        paddingVertical={sizeStyle.paddingVertical}
        paddingHorizontal={sizeStyle.paddingHorizontal}
        backgroundColor={C['surface/raised']}
        borderRadius={12}
        borderWidth={1.5}
        borderColor={isFocused ? C['brand/primary'] : C['border/subtle']}
        {...(isFocused && {
          shadowColor: C['brand/primary'],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        })}
      >
        {/* Search Icon */}
        <Text fontSize={18}>🔍</Text>

        {/* Input */}
        <RNTextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor={C['text/tertiary']}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            fontSize: sizeStyle.fontSize,
            color: C['text/primary'],
            fontFamily: 'Inter',
            borderWidth: 0,
            padding: 0,
            margin: 0,
          }}
        />

        {/* Clear Button */}
        {value && !disabled && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <X size={18} color={C['text/secondary']} strokeWidth={2.5} />
          </Pressable>
        )}
      </XStack>
    </XStack>
  );
}
