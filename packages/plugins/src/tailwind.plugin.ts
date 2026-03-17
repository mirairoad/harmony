import twPostcss from "@tailwindcss/postcss";
import postcss from "postcss";
import type { Builder } from "@harmony/dev";
import type { OnTransformOptions } from "@harmony/dev";

type PluginOptions = {
  /**
   * Base CSS to be included. Set to null to exclude base styles.
   */
  base?: string;
  /**
   * Enable or disable CSS optimization.
   * Defaults to true in production mode, false in development.
   * @default builder.config.mode === "production"
   */
  optimize?: boolean | {
    minify?: boolean;
  };
};

export interface TailwindPluginOptions extends PluginOptions {
  /**
   * Exclude paths or globs from Tailwind processing.
   * @example exclude: ["vendor", /\.legacy\.css$/]
   */
  exclude?: OnTransformOptions["exclude"];
}

/**
 * Tailwind CSS v4 plugin for Harmony.
 * Processes CSS files through PostCSS + Tailwind at build time.
 * Optimization is automatically enabled in production mode.
 *
 * @example
 * // In dev.ts:
 * import { tailwindPlugin } from "@harmony/plugins/tailwind";
 *
 * const builder = new HarmonyBuilder(harmony, {
 *   root: import.meta.dirname,
 *   importApp: async () => (await import("./main.ts")).app.getApp(),
 * });
 *
 * tailwindPlugin(builder.getBuilder("default")!, { exclude: ["/vendor/**"] });
 */
export function tailwindPlugin(
  builder: Builder,
  options: TailwindPluginOptions = {},
): void {
  const { exclude, ...tailwindOptions } = options;

  const instance = postcss(
    twPostcss({
      optimize: builder.config.mode === "production",
      ...tailwindOptions,
    }),
  );

  builder.onTransformStaticFile(
    { pluginName: "harmony-tailwind", filter: /\.css$/, exclude },
    async (args) => {
      const res = await instance.process(args.text, {
        from: args.path,
      });
      return {
        content: res.content,
        map: res.map?.toString(),
      };
    },
  );
}
