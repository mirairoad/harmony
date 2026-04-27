import type { FunctionComponent, JSX } from "preact";

export default function ({ Component }: { Component: FunctionComponent }): JSX.Element {
  return (
    <main>
      <Component />
    </main>
  );
}
