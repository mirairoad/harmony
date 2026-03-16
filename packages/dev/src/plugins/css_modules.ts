import type { Plugin as EsbuildPlugin } from "esbuild";
import * as path from "@std/path";

export interface CssModulesOptions {
  /**
   * How scoped class names are generated.
   * "local" — scope all classes by default (CSS Modules spec)
   * "global" — no scoping unless :local() is used
   * @default "local"
   */
  mode?: "local" | "global";
  /**
   * Pattern for generated class names.
   * Supports: [name], [hash], [local]
   * @default "[name]__[local]__[hash]"
   */
  pattern?: string;
}

/**
 * Generate a stable short hash from a string.
 * Not cryptographic — used for class name uniqueness only.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}

/**
 * Sanitize a string for use as a JS identifier.
 */
function toIdentifier(str: string): string {
  return str.replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^[0-9]/, "_$&");
}

/**
 * Generate a scoped class name from a pattern.
 */
function generateScopedName(
  localName: string,
  filePath: string,
  pattern: string,
): string {
  const name = path.basename(filePath, path.extname(filePath));
  const hash = hashString(filePath);
  return pattern
    .replace("[name]", name)
    .replace("[local]", localName)
    .replace("[hash]", hash);
}

/**
 * Parse a CSS string and return:
 * - transformed CSS with scoped class names
 * - classmap: { localName: scopedName }
 */
function transformCssModules(
  css: string,
  filePath: string,
  options: Required<CssModulesOptions>,
): { css: string; classMap: Record<string, string> } {
  const classMap: Record<string, string> = {};

  // Match .className selectors not inside :global()
  const transformed = css.replace(
    /(:global\s*\([^)]+\))|\.([a-zA-Z_][a-zA-Z0-9_-]*)/g,
    (match, globalBlock, localClass) => {
      // Leave :global(...) blocks untouched
      if (globalBlock) return globalBlock;

      if (options.mode === "global") return match;

      const scoped = generateScopedName(localClass, filePath, options.pattern);
      classMap[localClass] = scoped;
      return `.${scoped}`;
    },
  );

  return { css: transformed, classMap };
}

/**
 * Esbuild plugin for CSS Modules.
 *
 * Intercepts *.module.css imports in islands/TSX files.
 * Returns a JS module exporting the classmap as default.
 * The scoped CSS is injected as a side-effect import.
 *
 * @example
 * // In your dev.ts or harmony config:
 * import { cssModulesPlugin } from "@harmony/dev/plugins/css_modules";
 *
 * const builder = new Builder({
 *   plugins: [cssModulesPlugin()],
 * });
 *
 * // In your island:
 * import styles from "./Button.module.css";
 * // styles.container → "Button__container__a1b2c3"
 */
export function cssModulesPlugin(
  options: CssModulesOptions = {},
): EsbuildPlugin {
  const resolvedOptions: Required<CssModulesOptions> = {
    mode: options.mode ?? "local",
    pattern: options.pattern ?? "[name]__[local]__[hash]",
  };

  return {
    name: "harmony-css-modules",
    setup(build) {
      // Resolve .module.css imports to our virtual namespace
      build.onResolve({ filter: /\.module\.css$/ }, (args) => {
        const resolved = args.resolveDir
          ? path.resolve(args.resolveDir, args.path)
          : args.path;

        return {
          path: resolved,
          namespace: "harmony-css-modules",
        };
      });

      // Load the .module.css file and return a JS classmap module
      build.onLoad(
        { filter: /\.module\.css$/, namespace: "harmony-css-modules" },
        async (args) => {
          let css: string;
          try {
            css = await Deno.readTextFile(args.path);
          } catch {
            return {
              errors: [{
                text: `CSS Modules: could not read file: ${args.path}`,
              }],
            };
          }

          const { css: scopedCss, classMap } = transformCssModules(
            css,
            args.path,
            resolvedOptions,
          );

          // Write scoped CSS to a companion virtual file
          // esbuild will bundle it as a CSS side-effect
          const cssVirtualPath = args.path + "?scoped";

          // Build JS exports: export default { container: "Button__container__a1b2c3" }
          const exports = Object.entries(classMap)
            .map(([local, scoped]) =>
              `export const ${toIdentifier(local)} = ${JSON.stringify(scoped)};`
            )
            .join("\n");

          const contents = `
import ${JSON.stringify(cssVirtualPath)};
${exports}
const styles = {${
            Object.entries(classMap)
              .map(([local, scoped]) =>
                `${JSON.stringify(local)}: ${JSON.stringify(scoped)}`
              )
              .join(", ")
          }};
export default styles;
`.trim();

          // Register the scoped CSS companion
          build.onLoad(
            { filter: /\.module\.css\?scoped$/ },
            () => ({
              contents: scopedCss,
              loader: "css",
            }),
          );

          return {
            contents,
            loader: "js",
          };
        },
      );
    },
  };
}