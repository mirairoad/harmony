import type { RouteConfig } from "@hushkey/howl";
import type { FunctionComponent, JSX } from "preact";
// import { Partial } from "@hushkey/howl/runtime";

export const config: RouteConfig = {};

export default function App({ Component }: { Component: FunctionComponent }): JSX.Element {
  return (
    <html>
      <head>
        <title>Howl! + TailwindCSS</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <body f-client-nav>
          {/* <Partial name="main"> */}
          <Component />
          {/* </Partial> */}
        </body>
      </body>
    </html>
  );
}
