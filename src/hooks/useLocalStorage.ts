import { useState, useEffect, useCallback } from "react";

const SYNC_EVENT = "local-storage-sync";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Listen for changes from other hook instances
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === key) {
        setStoredValue(detail.newValue);
      }
    };
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      localStorage.setItem(key, JSON.stringify(next));
      // Notify other hook instances
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key, newValue: next } }));
      return next;
    });
  }, [key]);

  return [storedValue, setValue] as const;
}
