import { Anthropic } from '@anthropic-ai/sdk';
import { uuid, nowIso } from './db.js';

const client = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'] || 'sk-test',
});

interface RecipeGenerationInput {
  itemNames: string[];
  userPreferences?: {
    dietaryPreferences?: string[];
    cuisinePreferences?: string[];
    allergies?: string[];
  };
}

interface GeneratedRecipe {
  title: string;
  summary: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cookTimeMinutes: number;
  servings: number;
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
    optional: boolean;
  }>;
  steps: string[];
  tags: string[];
}

/**
 * Generate personalized recipes using Claude AI based on inventory items.
 * Falls back to mock recipes if API is unavailable.
 */
export async function generateRecipesWithAI(
  input: RecipeGenerationInput,
): Promise<GeneratedRecipe[]> {
  const { itemNames, userPreferences } = input;

  if (itemNames.length === 0) {
    return getMockRecipes(); // Return fallback if no items
  }

  try {
    const prompt = buildRecipePrompt(itemNames, userPreferences);

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return getMockRecipes();
    }

    const recipes = parseRecipesFromResponse(content.text);
    return recipes.length > 0 ? recipes : getMockRecipes();
  } catch (error) {
    console.warn(
      '[recipes] Claude API error, using fallback recipes:',
      error instanceof Error ? error.message : error,
    );
    return getMockRecipes();
  }
}

function buildRecipePrompt(
  itemNames: string[],
  prefs?: RecipeGenerationInput['userPreferences'],
): string {
  const dietaryNote = prefs?.dietaryPreferences?.length
    ? `Dietary preferences: ${prefs.dietaryPreferences.join(', ')}\n`
    : '';
  const allergyNote = prefs?.allergies?.length ? `Allergies: ${prefs.allergies.join(', ')}\n` : '';
  const cuisineNote = prefs?.cuisinePreferences?.length
    ? `Preferred cuisines: ${prefs.cuisinePreferences.join(', ')}\n`
    : '';

  return `You have these ingredients available: ${itemNames.join(', ')}

${dietaryNote}${allergyNote}${cuisineNote}

Generate 3 diverse, creative recipes that use at least 2 of these ingredients. Each recipe should be realistic, delicious, and achievable.

For each recipe, respond ONLY with valid JSON in this exact format (no markdown, no extra text):
[
  {
    "title": "Recipe Name",
    "summary": "One-line description",
    "difficulty": "easy" or "medium" or "hard",
    "cookTimeMinutes": 25,
    "servings": 2,
    "ingredients": [
      {"name": "ingredient", "quantity": "1", "unit": "cup", "optional": false},
      {"name": "ingredient2", "quantity": "2", "unit": "tbsp", "optional": true}
    ],
    "steps": ["Step 1 description", "Step 2 description"],
    "tags": ["quick", "vegetarian"]
  }
]

Generate creative, diverse recipes. Make them appetizing and practical.`;
}

function parseRecipesFromResponse(text: string): GeneratedRecipe[] {
  try {
    // Try to extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const recipes = JSON.parse(jsonMatch[0]) as GeneratedRecipe[];

    // Validate and clean recipes
    return recipes
      .filter((r): r is GeneratedRecipe => {
        return (
          typeof r.title === 'string' &&
          typeof r.summary === 'string' &&
          typeof r.difficulty === 'string' &&
          ['easy', 'medium', 'hard'].includes(r.difficulty) &&
          typeof r.cookTimeMinutes === 'number' &&
          typeof r.servings === 'number' &&
          Array.isArray(r.ingredients) &&
          Array.isArray(r.steps) &&
          r.steps.length > 0
        );
      })
      .slice(0, 3); // Max 3 recipes per request
  } catch (error) {
    console.warn('[recipes] Failed to parse recipes from response:', error);
    return [];
  }
}

/**
 * Mock recipes used as fallback when Claude API is unavailable.
 * These are diverse and actually good recipes (not templates).
 */
function getMockRecipes(): GeneratedRecipe[] {
  return [
    {
      title: 'Quick Garlic & Herb Pasta',
      summary: 'Silky pasta tossed with garlic, olive oil, and fresh herbs—simple elegance',
      difficulty: 'easy',
      cookTimeMinutes: 15,
      servings: 2,
      ingredients: [
        { name: 'Pasta', quantity: '8', unit: 'oz', optional: false },
        { name: 'Garlic', quantity: '4', unit: 'cloves', optional: false },
        { name: 'Olive oil', quantity: '3', unit: 'tbsp', optional: false },
        { name: 'Fresh herbs', quantity: '2', unit: 'tbsp', optional: true },
        { name: 'Red pepper flakes', quantity: 'pinch', unit: '', optional: true },
      ],
      steps: [
        'Bring salted water to boil and cook pasta until al dente.',
        'Meanwhile, mince garlic and heat olive oil in a large pan.',
        'Add garlic and sauté for 1-2 minutes until fragrant.',
        'Toss hot pasta with garlic oil, herbs, and pepper flakes. Serve immediately.',
      ],
      tags: ['quick', 'vegetarian', 'italian'],
    },
    {
      title: 'Sheet Pan Roasted Vegetables',
      summary: 'Caramelized vegetables with herbs—minimal prep, maximum flavor',
      difficulty: 'easy',
      cookTimeMinutes: 30,
      servings: 3,
      ingredients: [
        { name: 'Mixed vegetables', quantity: '1.5', unit: 'lbs', optional: false },
        { name: 'Olive oil', quantity: '3', unit: 'tbsp', optional: false },
        { name: 'Garlic', quantity: '3', unit: 'cloves', optional: false },
        { name: 'Herbs (rosemary, thyme)', quantity: '1', unit: 'tsp', optional: true },
        { name: 'Salt & pepper', quantity: 'to taste', unit: '', optional: false },
      ],
      steps: [
        'Preheat oven to 425°F.',
        'Toss vegetables with olive oil, minced garlic, and herbs.',
        'Spread on sheet pan in single layer.',
        'Roast for 25-30 minutes, stirring halfway, until golden and tender.',
      ],
      tags: ['vegetarian', 'healthy', 'one-pan'],
    },
    {
      title: 'Simple Vegetable Soup',
      summary: 'Warm, nourishing soup with fresh vegetables and broth',
      difficulty: 'easy',
      cookTimeMinutes: 25,
      servings: 4,
      ingredients: [
        { name: 'Vegetable broth', quantity: '4', unit: 'cups', optional: false },
        { name: 'Mixed vegetables', quantity: '2', unit: 'cups', optional: false },
        { name: 'Onion', quantity: '1', unit: '', optional: false },
        { name: 'Garlic', quantity: '2', unit: 'cloves', optional: false },
        { name: 'Herbs', quantity: '1', unit: 'tsp', optional: true },
      ],
      steps: [
        'Heat broth in a large pot.',
        'Sauté diced onion and garlic until softened.',
        'Add chopped vegetables and broth. Bring to simmer.',
        'Cook 15-20 minutes until vegetables are tender. Season with herbs and salt to taste.',
      ],
      tags: ['vegetarian', 'comfort-food', 'healthy'],
    },
  ];
}

/**
 * Format recipes for GraphQL response
 */
export function formatRecipesForGraphQL(recipes: GeneratedRecipe[], itemIds: string[] = []) {
  return recipes.map((recipe) => ({
    id: uuid(),
    title: recipe.title,
    summary: recipe.summary,
    cuisine: 'mixed',
    servings: recipe.servings,
    cookTimeMinutes: recipe.cookTimeMinutes,
    difficulty: recipe.difficulty,
    tags: recipe.tags || [],
    imageUrl: null,
    usedItemIds: itemIds.slice(0, Math.min(3, itemIds.length)),
    rating: null,
    notes: null,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity || '1',
      unit: ing.unit || 'unit',
      optional: ing.optional ?? false,
    })),
    steps: recipe.steps,
    createdAt: nowIso(),
  }));
}
