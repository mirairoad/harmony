import { useSignal } from "@preact/signals";
import type { JSX } from "preact/jsx-runtime";

export interface CounterProps {
  start?: number;
  label?: string;
}

export function Counter({ start = 0, label = "count" }: CounterProps): JSX.Element {
  const count = useSignal(start);

  return (
    <div class="flex flex-col items-center gap-3 p-6 rounded-2xl bg-base-200 border border-base-300">
      <span class="font-mono text-sm uppercase tracking-wider text-base-content/60">
        {label}
      </span>
      <span class="font-mono text-5xl font-bold text-primary tabular-nums">
        {count}
      </span>
      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-sm btn-ghost rounded-lg"
          onClick={() => count.value--}
        >
          −
        </button>
        <button
          type="button"
          class="btn btn-sm btn-primary rounded-lg"
          onClick={() => count.value++}
        >
          +
        </button>
      </div>
    </div>
  );
}
