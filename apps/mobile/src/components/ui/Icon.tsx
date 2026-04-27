import React from 'react';
import { Platform } from 'react-native';
import * as LucideIcons from 'lucide-react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  weight?: 'light' | 'regular' | 'semibold' | 'bold';
  accessibilityLabel?: string;
  accessible?: boolean;
}

export function Icon({
  name,
  size = 24,
  color = 'currentColor',
  weight = 'regular',
  accessibilityLabel,
  accessible = !accessibilityLabel,
}: IconProps) {
  // Map common icon names to both platforms
  const iconMap: Record<string, { sfSymbol: string; lucide: string }> = {
    home: { sfSymbol: 'house.fill', lucide: 'home' },
    camera: { sfSymbol: 'camera.fill', lucide: 'camera' },
    settings: { sfSymbol: 'gearshape.fill', lucide: 'settings' },
    grid: { sfSymbol: 'square.grid.2x2', lucide: 'grid' },
    x: { sfSymbol: 'xmark', lucide: 'x' },
    check: { sfSymbol: 'checkmark', lucide: 'check' },
    chevronRight: { sfSymbol: 'chevron.right', lucide: 'chevron-right' },
    chevronLeft: { sfSymbol: 'chevron.left', lucide: 'chevron-left' },
    heart: { sfSymbol: 'heart.fill', lucide: 'heart' },
    trash: { sfSymbol: 'trash.fill', lucide: 'trash-2' },
    edit: { sfSymbol: 'pencil', lucide: 'edit' },
    plus: { sfSymbol: 'plus', lucide: 'plus' },
    search: { sfSymbol: 'magnifyingglass', lucide: 'search' },
    bell: { sfSymbol: 'bell.fill', lucide: 'bell' },
    user: { sfSymbol: 'person.fill', lucide: 'user' },
  };

  const mapping = iconMap[name] || { lucide: name };

  // Use Lucide for both platforms
  const iconName = mapping.lucide
    .split('-')
    .reduce((acc: string, word: string, i: number) => {
      return (
        acc +
        (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      );
    }, '');

  const LucideIcon = (LucideIcons as any)[iconName];

  if (LucideIcon) {
    return (
      <LucideIcon
        size={size}
        color={color}
        strokeWidth={1.5}
        accessibilityLabel={accessibilityLabel}
        accessible={accessible}
      />
    );
  }

  return null;
}
