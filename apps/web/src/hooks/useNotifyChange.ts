import { useEffect } from "react";

// Calls `callback` whenever `value` changes. Used to bubble derived form
// state (e.g., file preview URLs) up to a parent without storing it twice.
// `callback` should be stable (useCallback) to avoid firing every render.
export function useNotifyChange<T>(
  value: T,
  callback: ((value: T) => void) | undefined,
) {
  useEffect(() => {
    callback?.(value);
  }, [value, callback]);
}
