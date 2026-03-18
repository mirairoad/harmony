import type { RouteConfig } from "@harmony/core/types";
import type { FunctionComponent, JSX } from "preact";
import { Partial } from "@harmony/core/runtime/shared";

export const config: RouteConfig = {};

export default function App({ Component }: { Component: FunctionComponent }): JSX.Element {
  return (
    <html>
      <head>
        <title>Harmony + Tailwind</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <body f-client-nav>
          <Partial name="main">
            <Component />
          </Partial>
        </body>
      </body>
    </html>
  );
}
