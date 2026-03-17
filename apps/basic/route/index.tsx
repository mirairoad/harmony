import type { RouteConfig } from "@harmony/core/types";
import type { JSX } from "preact";

export const config: RouteConfig = {};

export default function Home(): JSX.Element {
  return (
    <html>
      <head>
        <title>Harmony</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <h1>Harmony</h1>
      </body>
    </html>
  );
}