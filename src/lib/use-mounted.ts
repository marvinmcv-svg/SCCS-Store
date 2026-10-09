'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** True only after hydration, without a setState-in-effect re-render. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
