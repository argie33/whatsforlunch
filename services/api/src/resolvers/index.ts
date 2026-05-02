import {
  deltaSync,
  listItems,
  listContainers,
  listHouseholds,
  listHouseholdMembers,
  listShoppingItems,
  getShoppingListStats,
} from './queries';
import {
  createItem,
  updateItem,
  deleteItem,
  markItemEaten,
  markItemTossed,
  markItemFrozen,
  markItemPartial,
  claimContainer,
  createContainer,
  updateContainer,
  archiveContainer,
  createHousehold,
  renameHousehold,
  inviteHouseholdMember,
  removeHouseholdMember,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  markShoppingItemPurchased,
  markShoppingItemUnpurchased,
  rateRecipe,
} from './mutations';
import { signToken } from '../auth';

export const resolvers = {
  Query: {
    deltaSync,
    listItems,
    listContainers,
    listHouseholds,
    listHouseholdMembers,
    listShoppingItems,
    getShoppingListStats,
    me: () => ({
      id: 'dev-user-001',
      email: 'dev@example.com',
      displayName: 'Dev User',
      timeZone: 'America/New_York',
      units: 'imperial',
      locale: 'en-US',
      dietaryPreferences: [],
      cuisinePreferences: [],
      allergies: [],
      subscriptionTier: 'free',
      aiQuotaUsedToday: 0,
      aiQuotaResetAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    myHouseholds: () => [],
    foodRules: () => [],
  },
  Mutation: {
    // Item mutations
    createItem,
    updateItem,
    deleteItem,
    markItemEaten,
    markItemTossed,
    markItemFrozen,
    markItemPartial,
    // Container mutations
    claimContainer,
    createContainer,
    updateContainer,
    archiveContainer,
    // Household mutations
    createHousehold,
    renameHousehold,
    inviteHouseholdMember,
    removeHouseholdMember,
    // Shopping list mutations
    addShoppingListItem,
    updateShoppingListItem,
    deleteShoppingListItem,
    markShoppingItemPurchased,
    markShoppingItemUnpurchased,
    // Recipe mutations
    rateRecipe,
    // Dev-only: no Cognito, return a signed JWT for local testing
    signIn: (_: unknown, { email }: { email: string }) => {
      const userId = `dev-${email.split('@')[0]}-001`;
      const token = signToken({ sub: userId, email, households: ['dev-household-001'] });
      return { token, userId };
    },
  },
};
