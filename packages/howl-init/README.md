# @hushkey/howl-init

Scaffold a new [Howl](https://jsr.io/@hushkey/howl) project from a template.

## Usage

Run directly — no install required:

```sh
deno run -Ar jsr:@hushkey/howl-init
```

With a name and template:

```sh
deno run -Ar jsr:@hushkey/howl-init my-app --template basic
```

Show all options:

```sh
deno run -Ar jsr:@hushkey/howl-init --help
```

## Templates

| ID           | Description                                                |
| ------------ | ---------------------------------------------------------- |
| `basic`      | Minimal Howl app — single page, JSON API                   |
| `with-store` | Basic + Preact island wired to a `@preact/signals` store   |
| `docs`       | Tailwind + daisyUI docs site with JSON-driven content      |

Run `--help` to see the live list from the installed version.

## Flags

| Flag                    | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `-n, --name <name>`     | Project name (also accepted as positional arg)  |
| `-t, --template <id>`   | Template id (skip the picker)                   |
| `-h, --help`            | Show help                                       |

## What you get

The CLI creates a project folder under the current directory containing the
chosen template. After it finishes:

```sh
cd my-app
deno task dev
```

## Programmatic use

```ts
import { runInit } from "@hushkey/howl-init";

const result = await runInit({
  name: "my-app",
  template: "basic",
  cwd: Deno.cwd(),
});

console.log(result.path);
```

## License

MIT — see [LICENSE](./LICENSE).
