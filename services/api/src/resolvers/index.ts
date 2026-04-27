import { deltaSync, listItems, listContainers } from './queries';
import {
  createItem,
  updateItem,
  deleteItem,
  markItemEaten,
  markItemTossed,
  markItemFrozen,
  markItemPartial,
} from './mutations';
import { signToken } from '../auth';

export const resolvers = {
  Query: {
    deltaSync,
    listItems,
    listContainers,
    // Stub: other queries return empty/null for now
    me: () => ({ id: 'dev-user-001', email: 'dev@example.com', displayName: 'Dev User', timeZone: 'America/New_York', units: 'imperial', locale: 'en-US', dietaryPreferences: [], cuisinePreferences: [], allergies: [], subscriptionTier: 'free', aiQuotaUsedToday: 0, aiQuotaResetAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
    myHouseholds: () => [],
    foodRules: () => [],
  },
  Mutation: {
    createItem,
    updateItem,
    deleteItem,
    markItemEaten,
    markItemTossed,
    markItemFrozen,
    markItemPartial,
    // Dev-only: no Cognito, return a signed JWT for local testing
    signIn: (_: unknown, { email }: { email: string }) => {
      const userId = `dev-${email.split('@')[0]}-001`;
      const token = signToken({ sub: userId, email, households: ['dev-household-001'] });
      return { token, userId };
    },
  },
};
