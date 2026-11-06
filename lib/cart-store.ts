import 'client-only';
import { useSyncExternalStore } from 'react';
import {
  addItem,
  parseCart,
  removeItem,
  setNotes,
  setQty,
  type Cart,
  type CartItem,
} from '@/lib/cart';

// The cart is saved in localStorage, so it survives reloads without accounts.
// That is state outside React, and React's built-in way to read it is
// useSyncExternalStore:
// - on the server (and while the page hydrates) the cart is empty, so the
//   server HTML and the first browser render match;
// - after that, components read the saved cart, and re-render when it changes
//   here or in another tab.
const STORAGE_KEY = 'us-cart-v1';
const EMPTY_CART: Cart = [];

let cart: Cart = EMPTY_CART;
let loaded = false;
const listeners = new Set<() => void>();

// Must return the same array until the cart changes, so React can tell
// "unchanged" from "changed" by reference.
function getSnapshot(): Cart {
  if (!loaded) {
    loaded = true;
    try {
      cart = parseCart(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage blocked (strict privacy settings): start empty, in memory only.
    }
  }
  return cart;
}

function getServerSnapshot(): Cart {
  return EMPTY_CART;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onOtherTabChange);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onOtherTabChange);
  };
}

// Fired when another tab changes localStorage (key is null if it was cleared).
function onOtherTabChange(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  cart = parseCart(event.newValue);
  notify();
}

function notify() {
  for (const listener of listeners) listener();
}

function save(next: Cart) {
  cart = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the cart still works for this visit.
  }
  notify();
}

export function useCart(): Cart {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Actions are plain functions, so event handlers (and later the chat) can call them.
export function addToCart(item: CartItem, qty = 1, notes?: string) {
  save(addItem(getSnapshot(), item, qty, notes));
}

export function updateQty(id: string, qty: number) {
  save(setQty(getSnapshot(), id, qty));
}

export function updateNotes(id: string, notes: string) {
  save(setNotes(getSnapshot(), id, notes));
}

export function removeFromCart(id: string) {
  save(removeItem(getSnapshot(), id));
}

export function clearCart() {
  save(EMPTY_CART);
}
