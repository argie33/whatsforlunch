import { renderHook } from '@testing-library/react-hooks';
import { useAuthIds } from '../useAuthIds';

jest.mock('../useCurrentUser', () => ({
  useCurrentUser: jest.fn(() => ({
    status: 'authenticated',
    user: { userId: 'u-123', name: 'Test', email: 'test@test.com' },
  })),
}));

jest.mock('../useHouseholdId', () => ({
  useHouseholdId: jest.fn(() => 'h-abc'),
}));

describe('useAuthIds', () => {
  it('returns user and household IDs from auth state', () => {
    const { result } = renderHook(() => useAuthIds());
    expect(result.current.userId).toBe('u-123');
    expect(result.current.householdId).toBe('h-abc');
  });

  it('falls back to placeholder when not authenticated', () => {
    const { useCurrentUser } = require('../useCurrentUser');
    const { useHouseholdId } = require('../useHouseholdId');
    useCurrentUser.mockReturnValueOnce({ status: 'unauthenticated' });
    useHouseholdId.mockReturnValueOnce(null);
    const { result } = renderHook(() => useAuthIds());
    expect(result.current.userId).toBe('user_placeholder');
    expect(result.current.householdId).toBe('household_placeholder');
  });
});
