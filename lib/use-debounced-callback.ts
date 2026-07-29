"use client";

import { useCallback, useRef } from "react";

// Delays invoking `callback` until `delayMs` has passed since the last
// call — covers both keyboard typing and rapid stepper +/- clicks with the
// same mechanism. The ref-based timer means the debounced function identity
// stays stable across renders without needing it in dependency arrays.
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs = 800
): (...args: Args) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs]
  );
}
