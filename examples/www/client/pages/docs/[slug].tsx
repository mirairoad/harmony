import type { Context } from "@hushkey/howl";
import type { State } from "../../../../howl.config.ts";
import type { BlockType, ManifestItem } from "../../../server/docs/reader.ts";
import { readDoc, readManifest } from "../../../server/docs/reader.ts";
import { Head } from "../../../../../packages/core/runtime/head.ts";

function CodeBlock({ lang, text, filename }: { lang: string; text: string; filename?: string }) {
  return (
    <div class="rounded-xl overflow-hidden my-4 border border-base-300 text-sm">
      {filename && (
        <div class="bg-base-300 px-4 py-1.5 text-xs font-mono text-base-content/60 border-b border-base-300">
          {filename}
        </div>
      )}
      <div class={`bg-neutral text-neutral-content px-5 py-4 overflow-x-auto ${filename ? "" : ""}`}>
        <pre class="font-mono text-[13px] leading-relaxed whitespace-pre">{text}</pre>
      </div>
      {lang !== "text" && (
        <div class="bg-base-300 px-4 py-1 text-right">
          <span class="badge badge-xs badge-ghost font-mono">{lang}</span>
        </div>
      )}
    </div>
  );
}

function Block({ block }: { block: BlockType }) {
  switch (block.type) {
    case "p":
      return <p class="text-base-content/80 leading-relaxed my-3">{block.text}</p>;

    case "code":
      return <CodeBlock lang={block.lang} text={block.text} filename={block.filename} />;

    case "h3":
      return <h3 class="text-lg font-semibold mt-6 mb-2">{block.text}</h3>;

    case "tip":
      return (
        <div class="alert bg-success/10 border border-success/20 my-4 text-sm">
          <span class="text-success font-semibold mr-1">Tip:</span>
          <span class="text-base-content/80">{block.text}</span>
        </div>
      );

    case "warning":
      return (
        <div class="alert bg-warning/10 border border-warning/20 my-4 text-sm">
          <span class="text-warning font-semibold mr-1">Warning:</span>
          <span class="text-base-content/80">{block.text}</span>
        </div>
      );

    case "list":
      return (
        <ul class="list-disc list-inside my-3 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} class="text-base-content/80 text-sm">{item}</li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div class="overflow-x-auto my-4 rounded-xl border border-base-300">
          <table class="table table-sm">
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th key={h} class="bg-base-200 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} class="hover:bg-base-200/50">
                  {row.map((cell, j) => (
                    <td key={j} class="font-mono text-xs">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

function PrevNext(
  { manifest, currentSlug }: { manifest: ManifestItem[]; currentSlug: string },
) {
  const idx = manifest.findIndex((m) => m.slug === currentSlug);
  const prev = idx > 0 ? manifest[idx - 1] : null;
  const next = idx < manifest.length - 1 ? manifest[idx + 1] : null;

  return (
    <div class="flex justify-between gap-4 mt-12 pt-8 border-t border-base-300">
      {prev
        ? (
          <a href={`/docs/${prev.slug}`} class="group flex flex-col max-w-xs">
            <span class="text-xs text-base-content/40 mb-1">← Previous</span>
            <span class="text-sm font-medium group-hover:text-primary transition-colors">
              {prev.title}
            </span>
          </a>
        )
        : <div />}
      {next && (
        <a href={`/docs/${next.slug}`} class="group flex flex-col items-end max-w-xs">
          <span class="text-xs text-base-content/40 mb-1">Next →</span>
          <span class="text-sm font-medium group-hover:text-primary transition-colors">
            {next.title}
          </span>
        </a>
      )}
    </div>
  );
}

export default async function DocPage(ctx: Context<State>): Promise<JSX.Element> {
  const { slug } = ctx.params;
  const [doc, manifest] = await Promise.all([readDoc(slug), readManifest()]);

  if (!doc) {
    return ctx.redirect("/docs") as unknown as JSX.Element;
  }

  return (
    <>
      <Head>
        <title>{doc.title} — Howl Docs</title>
        <meta name="description" content={doc.description} />
      </Head>
      <article class="max-w-3xl mx-auto px-6 py-10">
        {/* Page header */}
        <div class="mb-8 pb-6 border-b border-base-300">
          <h1 class="text-3xl font-bold tracking-tight mb-2">{doc.title}</h1>
          <p class="text-base-content/60">{doc.description}</p>
        </div>

        {/* Table of contents */}
        {doc.sections.length > 2 && (
          <div class="bg-base-200 rounded-xl p-4 mb-8 text-sm">
            <p class="font-semibold text-xs uppercase tracking-widest text-base-content/50 mb-2">
              On this page
            </p>
            <ul class="space-y-1">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    class="text-base-content/60 hover:text-primary transition-colors"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        {doc.sections.map((section) => (
          <section key={section.id} id={section.id} class="mb-10 scroll-mt-8">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
              <a
                href={`#${section.id}`}
                class="hover:text-primary transition-colors"
              >
                {section.heading}
              </a>
            </h2>
            {section.blocks.map((block, i) => <Block key={i} block={block} />)}
          </section>
        ))}

        <PrevNext manifest={manifest} currentSlug={slug} />
      </article>
    </>
  );
}
