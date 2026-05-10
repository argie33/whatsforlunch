export const mockCapture = jest.fn();

export default class PostHog {
  capture = mockCapture;
  identify = jest.fn();
  reset = jest.fn();
}

export function usePostHog() {
  return { capture: mockCapture, identify: jest.fn(), reset: jest.fn() };
}
