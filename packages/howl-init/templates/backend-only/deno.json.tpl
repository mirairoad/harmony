{
  "name": "{{PROJECT_NAME}}",
  "version": "0.0.1",
  "tasks": {
    "dev": "deno run -A --env-file=.env --watch --watch-exclude=dist/,node_modules/ dev.ts",
    "build": "deno run -A dev.ts build",
    "start": "deno run -A dist/compiled-entry.js",
    "compile": "deno compile --output ./dist/bin/{{PROJECT_NAME}} --include dist -A dist/compiled-entry.js"
  },
  "exports": "./server/main.ts",
  "imports": {
    "@hushkey/howl": "jsr:@hushkey/howl@^{{HOWL_VERSION}}",
    "@std/path": "jsr:@std/path@^1.0.0",
    "zod": "npm:zod@4.3.6"
  },
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "deno.ns", "deno.unstable"]
  }
}
