import { useEffect, useState } from "react";

/**
 * @name useDebounce
 * @description Pass a new value, and a delay (default 300ms), And it will return the same type with the specified value after the delay.
 * @param value The value to debounce
 * @param delay The delay
 * @returns {value} The debounced value
 */
export function useDebounce<T>(value: T, delay = 300): T {
  // The type is T because the value is the type we pass in
  const [debounced, setDebounced] = useState(value); // This holds the debounced value
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay); // After the delay, update the debounced value to the latest value
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced; // We return the new value after the debounce delay has passed
}

/**
 * @name useClock
 * @description A hook that returns the current timestamp. It updates every second.
 * @returns The current UNIX timestamp.
 */
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = setInterval(() => setNow(Date.now()), 1000); // This ticks that clock every second
    return () => clearInterval(update);
  }, []);
  return now;
}
