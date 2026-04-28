import React from 'react';
import { act as testRendererAct, create } from 'react-test-renderer';

export function act(fn: () => void) {
  testRendererAct(() => {
    fn();
  });
}

export function renderHook<TResult>(callback: () => TResult): { result: { current: TResult } } {
  const result: { current: TResult } = { current: undefined as any };

  function TestComponent() {
    result.current = callback();
    return null;
  }

  testRendererAct(() => {
    create(React.createElement(TestComponent));
  });

  return { result };
}
