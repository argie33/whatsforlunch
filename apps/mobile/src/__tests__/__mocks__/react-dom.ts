// Stub for react-dom in React Native jest environment
// @tamagui/web conditionally requires react-dom; this prevents the missing module error.
export const createRoot = jest.fn();
export const hydrateRoot = jest.fn();
export const findDOMNode = jest.fn();
export const unstable_batchedUpdates = (fn: () => void) => fn();
export default { createRoot, hydrateRoot, findDOMNode, unstable_batchedUpdates };
