import type { FunctionComponent, JSX } from "preact";
import { Partial } from "@hushkey/howl/runtime";

export default function ({ Component }: { Component: FunctionComponent }): JSX.Element {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Howl App</title>
      </head>
      <body f-client-nav>
        <Partial name="main">
          <Component />
        </Partial>
      </body>
    </html>
  );
}
