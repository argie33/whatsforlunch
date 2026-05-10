const noOp = jest.fn();
export const Sentry = {
  captureException: noOp,
  captureMessage: noOp,
  addBreadcrumb: noOp,
  setUser: noOp,
  init: noOp,
  withScope: jest.fn((cb: (s: any) => void) => cb({ setExtra: noOp })),
};
export const captureException = noOp;
export const addBreadcrumb = noOp;
export const setUser = noOp;
