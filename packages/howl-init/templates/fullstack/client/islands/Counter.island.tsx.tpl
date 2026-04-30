import { Counter, type CounterProps } from "../components/Counter.tsx";
import type { JSX } from "preact/jsx-runtime";

export default function CounterIsland(props: CounterProps): JSX.Element {
  return <Counter {...props} />;
}
