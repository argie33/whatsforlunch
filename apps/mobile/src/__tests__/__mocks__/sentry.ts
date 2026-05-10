export const init = jest.fn();
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const setUser = jest.fn();
export const setContext = jest.fn();
export const setTag = jest.fn();
export const addBreadcrumb = jest.fn();
export const withScope = jest.fn((cb: (scope: any) => void) =>
  cb({ setExtra: jest.fn(), setLevel: jest.fn() }),
);
export const wrap = jest.fn((component: any) => component);
export const ReactNavigationInstrumentation = jest.fn();
export const ReactNativeTracing = jest.fn();
export const Severity = { Error: 'error', Warning: 'warning', Info: 'info', Debug: 'debug' };
