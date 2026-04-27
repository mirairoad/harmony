/**
 * @module
 *
 * Official plugin entrypoint for `@hushkey/howl/plugins`. Exports
 * {@linkcode tailwindPlugin} for wiring Tailwind v4 into the build
 * pipeline, plus a `tailwindConfigBase` literal that user
 * `tailwind.config.ts` files can extend.
 */

export { tailwindPlugin, type TailwindPluginOptions } from "./tailwind.plugin.ts";
export { baseConfig as tailwindConfigBase } from "./tailwind.config.base.ts";
