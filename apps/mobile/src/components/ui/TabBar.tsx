import { View, Pressable, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

// Conditional import for BlurView (doesn't work well on web)
let BlurView: any = null;
let BlurViewAvailable = false;

try {
  if (Platform.OS !== 'web') {
    const blur = require('expo-blur');
    BlurView = blur.BlurView;
    BlurViewAvailable = true;
  }
} catch {
  BlurViewAvailable = false;
}

export type TabBarTab = {
  name: string;
  icon: string;
  label: string;
  isFAB?: boolean;
};

interface TabBarProps {
  tabs: TabBarTab[];
  activeTab: string;
  onTabPress: (name: string) => void;
}

export function TabBar({ tabs, activeTab, onTabPress }: TabBarProps) {
  const insets = useSafeAreaInsets();

  const tabBarView = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 16),
        paddingHorizontal: 16,
        backgroundColor: 'rgba(250, 246, 238, 0.85)',
        borderTopWidth: 0.5,
        borderTopColor: C['border/subtle'],
      }}
    >
      {tabs.map((tab) => {
        const focused = activeTab === tab.name;

        if (tab.isFAB) {
          return (
            <Pressable
              key={tab.name}
              onPress={() => onTabPress(tab.name)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: C['brand/primary'],
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -28,
                shadowColor: C['brand/primary'],
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
                opacity: focused ? 1 : 0.8,
              }}
            >
              <Text style={{ fontSize: 22, color: 'white' }}>{tab.icon}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={tab.name}
            onPress={() => onTabPress(tab.name)}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{tab.icon}</Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: focused ? C['brand/primary'] : C['text/tertiary'],
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Use BlurView on mobile, fallback to plain view on web
  if (BlurViewAvailable && BlurView) {
    return (
      <BlurView intensity={80} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {tabBarView}
      </BlurView>
    );
  }

  return tabBarView;
}
