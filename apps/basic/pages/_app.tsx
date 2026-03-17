import type { RouteConfig } from "@harmony/core/types";
import type { JSX } from "preact";

export const config: RouteConfig = {};

export default function App({ Component }: { Component: JSX.Element }): JSX.Element {
  return (
    <html>
      <head>
        <title>Harmony + Tailwind</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
