import { ScrollView, View, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack, Button } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

const recipes = [
  {
    title: 'Creamy Mushroom Pasta',
    time: '25 min',
    uses: ['Mushrooms', 'Spinach', 'Cream'],
    image: '🍝',
  },
  {
    title: 'Spinach & Feta Salad',
    time: '10 min',
    uses: ['Spinach', 'Feta', 'Olive Oil'],
    image: '🥗',
  },
  {
    title: 'Mushroom Risotto',
    time: '35 min',
    uses: ['Mushrooms', 'Rice', 'Parmesan'],
    image: '🍚',
  },
];

export default function DigestScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Today's Pick",
          headerShown: true,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <YStack
          padding={24}
          backgroundColor={C['accent/coral']}
          borderRadius={32}
          marginVertical={16}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={56}>🍽</Text>
          <Text
            fontSize={28}
            fontWeight="800"
            fontFamily="Fraunces"
            color="white"
            marginTop={16}
            textAlign="center"
            letterSpacing={-0.5}
          >
            What to eat today
          </Text>
          <Text fontSize={14} color="rgba(255,255,255,0.95)" marginTop={12} textAlign="center">
            Spinach expires tomorrow, mushrooms expire in 2 days
          </Text>
        </YStack>

        {/* Quick Stats */}
        <XStack gap={10} marginBottom={20}>
          <YStack
            flex={1}
            padding={12}
            backgroundColor={C['status/freshBg']}
            borderRadius={32}
            alignItems="center"
            borderWidth={1}
            borderColor={C['status/fresh']}
          >
            <Text
              fontSize={28}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['status/fresh']}
              letterSpacing={-0.8}
            >
              3
            </Text>
            <Text fontSize={11} color={C['status/fresh']} fontWeight="600" marginTop={4}>
              Items to use
            </Text>
          </YStack>
          <YStack
            flex={1}
            padding={12}
            backgroundColor={C['accent/honeySoft']}
            borderRadius={32}
            alignItems="center"
            borderWidth={1}
            borderColor={C['accent/honey']}
          >
            <Text
              fontSize={28}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['accent/honey']}
              letterSpacing={-0.8}
            >
              3
            </Text>
            <Text fontSize={11} color={C['accent/honey']} fontWeight="600" marginTop={4}>
              Recipes found
            </Text>
          </YStack>
        </XStack>

        {/* Recipes */}
        <Text
          fontSize={16}
          fontWeight="800"
          fontFamily="Fraunces"
          color={C['text/primary']}
          marginBottom={12}
          letterSpacing={-0.3}
        >
          Quick recipes
        </Text>
        {recipes.map((recipe, idx) => (
          <Pressable key={idx} onPress={() => router.push('/recipes')} style={{ marginBottom: 12 }}>
            <YStack
              padding={16}
              backgroundColor={C['surface/raised']}
              borderRadius={32}
              borderWidth={1}
              borderColor={C['border/subtle']}
            >
              <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
                <YStack flex={1}>
                  <Text
                    fontSize={16}
                    fontWeight="700"
                    fontFamily="Fraunces"
                    color={C['text/primary']}
                  >
                    {recipe.title}
                  </Text>
                  <Text
                    fontSize={12}
                    color={C['text/secondary']}
                    marginTop={6}
                    letterSpacing={-0.1}
                  >
                    ⏱ {recipe.time} • Uses: {recipe.uses.join(', ')}
                  </Text>
                </YStack>
                <Text fontSize={28}>{recipe.image}</Text>
              </XStack>
            </YStack>
          </Pressable>
        ))}

        {/* Bottom CTA */}
        <YStack padding={16} backgroundColor={C['status/freshBg']} borderRadius={32} marginTop={20}>
          <Text
            fontSize={13}
            fontWeight="700"
            fontFamily="Fraunces"
            color={C['status/fresh']}
            letterSpacing={-0.2}
          >
            💡 Tip: Add these recipes to your meal plan for next week
          </Text>
          <XStack gap={8} marginTop={12}>
            <Button flex={1} onPress={() => router.push('/meal-plan')}>
              Meal Plan
            </Button>
            <Button flex={1} variant="outlined" onPress={() => router.push('/recipes')}>
              More recipes
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </>
  );
}
