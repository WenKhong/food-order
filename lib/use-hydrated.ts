import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// false during the server render and while the page hydrates, true afterwards.
// Lets a component show a neutral placeholder until browser-only data (like the
// cart in localStorage) is readable, instead of flashing "your cart is empty".
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
