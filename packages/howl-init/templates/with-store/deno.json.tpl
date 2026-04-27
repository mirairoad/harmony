{
  "name": "{{PROJECT_NAME}}",
  "version": "0.0.0",
  "exports": "./main.ts",
  "tasks": {
    "dev": "deno run -A --watch dev.ts",
    "build": "deno run -A dev.ts build",
    "start": "deno run -A dist/compiled-entry.js"
  },
  "imports": {
    "@hushkey/howl": "jsr:@hushkey/howl@^{{HOWL_VERSION}}",
    "preact": "npm:preact@^10.25.0",
    "preact/hooks": "npm:preact@^10.25.0/hooks",
    "preact/jsx-runtime": "npm:preact@^10.25.0/jsx-runtime",
    "@preact/signals": "npm:@preact/signals@^2.8.2",
    "zod": "npm:zod@4.3.6"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "lib": ["dom", "dom.iterable", "deno.ns"],
    "jsxPrecompileSkipElements": [
      "a",
      "img",
      "source",
      "body",
      "html",
      "head",
      "title",
      "meta",
      "script",
      "link",
      "style",
      "base",
      "noscript",
      "template"
    ]
  }
}
