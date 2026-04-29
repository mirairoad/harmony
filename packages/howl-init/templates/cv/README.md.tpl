# {{PROJECT_NAME}}

A developer CV / portfolio site built with [Howl](https://jsr.io/@hushkey/howl).
Tailwind v4 + daisyUI styling, JSON-driven content, project cards with
drill-down detail pages.

## Setup

```sh
deno install
cp .env.example .env
deno task dev
```

Open <http://127.0.0.1:8000>.

## Environment

| Variable        | Default        | Purpose                              |
| --------------- | -------------- | ------------------------------------ |
| `APP_NAME`      | `CV`           | Brand title — shown in header / tab  |
| `DENO_PORT`     | `8000`         | Dev / start server port              |
| `DENO_HOSTNAME` | `127.0.0.1`    | Dev / start server bind hostname     |

## Editing your CV

Everything is JSON. No DB, no CMS — edit a file, save, refresh.

1. **Profile** — name, bio, skills, experience, education, social links live in
   [`server/cv/profile.json`](server/cv/profile.json).
2. **Projects list** — append an entry to
   [`server/cv/projects/manifest.json`](server/cv/projects/manifest.json) for
   each project you want on the gallery.
3. **Project detail** — drop a JSON file under
   [`server/cv/projects/`](server/cv/projects/) (same shape as the sample
   `howl.json`) and register the import in
   [`server/cv/reader.ts`](server/cv/reader.ts) — the file ships with commented
   examples showing exactly where.

The slug in the project JSON body, the manifest entry, and the registry key
must all match.

## Project layout

```
server/
  main.ts                # Howl app, middleware order, env wiring
  apis/                  # File-system API routes (.api.ts)
  cv/
    profile.json         # name, bio, skills, experience, education, social
    reader.ts            # registers profile + project files — edit when adding
    projects/
      manifest.json      # ordered project list with cards metadata
      *.json             # individual project detail pages
client/
  pages/
    _app.tsx             # HTML shell + <head>
    _layout.tsx          # site chrome (top bar + mobile tabs)
    _error.tsx           # error page
    index.tsx            # CV home — hero, about, skills, experience, projects
    projects/
      index.tsx          # full projects gallery
      [slug].tsx         # generic project detail renderer
static/
  style.css              # Tailwind entry, theme tokens, animations
  logo.svg               # placeholder — swap for your own brand mark
howl.config.ts           # State, roles, defineApi factory
dev.ts                   # HowlBuilder entry — dev server + production build
tailwind.config.ts       # daisyUI plugin + content globs
```

## Public APIs

The same data the pages render is also exposed as JSON:

| Endpoint                             | Returns                            |
| ------------------------------------ | ---------------------------------- |
| `GET /api/public/profile`            | The full profile.json              |
| `GET /api/public/projects`           | The projects manifest (cards data) |
| `GET /api/public/projects/:slug`     | A single project detail            |
| `GET /api/public/ping`               | Health probe                       |

## Production

```sh
deno task build && deno task start          # plain Deno run
deno task build && deno task compile         # single-binary
```
