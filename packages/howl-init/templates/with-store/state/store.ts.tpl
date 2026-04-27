import { signal, type Signal } from "@preact/signals";

export const counter: Signal<number> = signal(0);

export const increment = (): number => ++counter.value;
export const decrement = (): number => --counter.value;
export const reset = (): void => {
  counter.value = 0;
};
