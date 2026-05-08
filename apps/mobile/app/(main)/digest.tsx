import { ScrollView, View, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack, Button } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

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
          backgroundColor="#FF8A3D"
          borderRadius={20}
          marginVertical={16}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={56}>🍽</Text>
          <Text fontSize={24} fontWeight="800" color="white" marginTop={16} textAlign="center">
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
            backgroundColor="#E8F2EC"
            borderRadius={12}
            alignItems="center"
          >
            <Text fontSize={20} fontWeight="800" color="#2F7D5B">
              3
            </Text>
            <Text fontSize={11} color="#2F7D5B" fontWeight="600" marginTop={4}>
              Items to use
            </Text>
          </YStack>
          <YStack
            flex={1}
            padding={12}
            backgroundColor="#FAF1E1"
            borderRadius={12}
            alignItems="center"
          >
            <Text fontSize={20} fontWeight="800" color="#C98A2B">
              3
            </Text>
            <Text fontSize={11} color="#C98A2B" fontWeight="600" marginTop={4}>
              Recipes found
            </Text>
          </YStack>
        </XStack>

        {/* Recipes */}
        <Text fontSize={16} fontWeight="800" color="#0F1411" marginBottom={12}>
          Quick recipes
        </Text>
        {recipes.map((recipe, idx) => (
          <Pressable key={idx} onPress={() => router.push('/recipes')} style={{ marginBottom: 12 }}>
            <YStack
              padding={16}
              backgroundColor="#FFFFFF"
              borderRadius={12}
              borderWidth={1}
              borderColor="#E8E5DE"
            >
              <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="700" color="#0F1411">
                    {recipe.title}
                  </Text>
                  <Text fontSize={12} color="#5C615E" marginTop={6}>
                    ⏱ {recipe.time} • Uses: {recipe.uses.join(', ')}
                  </Text>
                </YStack>
                <Text fontSize={28}>{recipe.image}</Text>
              </XStack>
            </YStack>
          </Pressable>
        ))}

        {/* Bottom CTA */}
        <YStack padding={16} backgroundColor="#E8F2EC" borderRadius={12} marginTop={20}>
          <Text fontSize={13} fontWeight="700" color="#2F7D5B">
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
