import { counter, decrement, increment, reset } from "../state/store.ts";

export default function Counter() {
  return (
    <div style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem 0;">
      <button type="button" onClick={decrement} aria-label="decrement">−</button>
      <span style="min-width: 3ch; text-align: center; font-variant-numeric: tabular-nums;">
        {counter}
      </span>
      <button type="button" onClick={increment} aria-label="increment">+</button>
      <button type="button" onClick={reset}>reset</button>
    </div>
  );
}
