import { useEffect, useSyncExternalStore } from "react";
import { store } from "./store";

/**
 * Subscribe to the in-memory store so components re-render on mutations
 * (cart changes, admin edits, order placement, banner updates, etc.).
 */
export function useStore() {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return store;
}

/**
 * Load catalogue data from the API once this page has hydrated. Running this
 * from a page effect (instead of the root shell) keeps server-rendered seed
 * data and the first client render identical, so hydration stays clean.
 */
export function useStoreBootstrap() {
  useEffect(() => {
    void store.bootstrap();
  }, []);
}
