/**
 * Lambda: suggestRecipes
 * Generates recipe suggestions using Claude based on available items
 * Tracks cost and quota deduction
 */

import { randomUUID } from 'crypto';
import BedrockClient from '../shared/bedrockClient';

const bedrock = new BedrockClient(process.env.AWS_REGION);

interface SuggestRecipesEvent {
  householdId: string;
  itemIds: string[];
  itemNames: string[];
  dietaryPreferences?: string[];
  allergens?: string[];
}

interface RecipeSuggestion {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  linkedItemIds: string[];
  missingIngredients: string[];
  steps: string[];
}

interface SuggestRecipesResponse {
  recipes: RecipeSuggestion[];
  reasoning?: string;
  cost: number;
  model: string;
  promptVersion: number;
}

export async function handler(event: SuggestRecipesEvent): Promise<SuggestRecipesResponse> {
  const startTime = Date.now();

  try {
    const itemList = event.itemNames.join(', ');
    const prompt = buildRecipePrompt(itemList, event.dietaryPreferences, event.allergens);

    const response = await bedrock.generateRecipes(prompt);

    const latencyMs = Date.now() - startTime;
    const cost = calculateBedrockCost(response.usage);

    const recipes = parseRecipesFromResponse(response.text, event.itemIds, event.itemNames);

    // TODO: Deduct quota in production
    // await deductAiQuota(event.householdId, 'suggestRecipes');

    return {
      recipes: recipes.slice(0, 5),
      reasoning: response.text.split('\n').find((line) => line.includes('reasoning')) || undefined,
      cost,
      model: 'claude-3-5-sonnet-20241022',
      promptVersion: 1,
    };
  } catch (error) {
    console.error('suggestRecipes error:', error);
    throw new Error(`Failed to suggest recipes: ${error}`);
  }
}

function buildRecipePrompt(items: string, dietary?: string[], allergens?: string[]): string {
  let prompt = `You are a helpful cooking assistant. Generate 2-5 recipe suggestions using these available ingredients: ${items}.

Format each recipe as JSON in this exact structure (output ONLY valid JSON, no markdown):
[
  {
    "title": "Recipe name",
    "description": "One sentence description",
    "durationMinutes": 30,
    "difficulty": "easy|medium|hard",
    "servings": 4,
    "usesItems": ["item1", "item2"],
    "missingIngredients": ["optional ingredient"],
    "steps": ["Step 1", "Step 2", ...]
  }
]

Important guidelines:
- Each recipe should use at least 2-3 of the available ingredients
- Keep recipes simple and practical (15-60 min)
- Difficulty: easy (basics), medium (some technique), hard (advanced)
- Return exact item names from the list when referencing usesItems
- Missing ingredients should be common pantry staples if needed`;

  if (dietary && dietary.length > 0) {
    prompt += `\nDietary preferences: ${dietary.join(', ')}`;
  }

  if (allergens && allergens.length > 0) {
    prompt += `\nAVOID these allergens: ${allergens.join(', ')}`;
  }

  return prompt;
}

function parseRecipesFromResponse(
  response: string,
  itemIds: string[],
  itemNames: string[],
): RecipeSuggestion[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((recipe: any) => ({
      id: randomUUID(),
      title: recipe.title || 'Recipe',
      description: recipe.description || '',
      durationMinutes: Math.min(Math.max(recipe.durationMinutes || 30, 5), 300),
      difficulty: (recipe.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
      servings: Math.min(Math.max(recipe.servings || 4, 1), 12),
      linkedItemIds: (recipe.usesItems || [])
        .map((name: string) => {
          const idx = itemNames.findIndex((n) => n.toLowerCase().includes(name.toLowerCase()));
          return idx >= 0 ? itemIds[idx] : null;
        })
        .filter(Boolean),
      missingIngredients: recipe.missingIngredients || [],
      steps: recipe.steps || [],
    }));
  } catch (e) {
    console.error('Failed to parse recipe response:', e);
    return [];
  }
}

function calculateBedrockCost(usage: any): number {
  // Claude 3.5 Sonnet pricing
  const inputCost = 0.003 / 1000; // $3.00 per 1M input tokens
  const outputCost = 0.015 / 1000; // $15.00 per 1M output tokens
  const cacheWriteCost = 0.00375 / 1000; // $3.75 per 1M cache write tokens
  const cacheReadCost = 0.0003 / 1000; // $0.30 per 1M cache read tokens

  let totalCost = usage.inputTokens * inputCost;
  totalCost += usage.outputTokens * outputCost;
  if (usage.cacheCreationTokens) {
    totalCost += usage.cacheCreationTokens * cacheWriteCost;
  }
  if (usage.cacheReadTokens) {
    totalCost += usage.cacheReadTokens * cacheReadCost;
  }

  return Math.round(totalCost * 100000) / 100000;
}
