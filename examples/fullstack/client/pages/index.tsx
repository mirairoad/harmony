import type { Context } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";
import { Head } from "../../../../packages/core/runtime/head.ts";

export default function Index(ctx: Context<State>) {
  console.log("ctx:", ctx.state);
  return (
    <>
      <Head>
        <title>Howl | Home</title>
      </Head>
      <div class="min-h-[calc(100vh-4rem)] bg-black flex flex-col items-center justify-center font-mono text-white">
        <div class="text-center space-y-6 px-8">
          <div class="text-xs tracking-[0.4em] text-green-400 uppercase mb-2 animate-pulse">
            &gt;&gt; SYSTEM INITIALIZED
          </div>
          <h1 class="text-6xl font-bold tracking-tight">
            <span class="text-white">HOWL</span>
            <span class="text-gray-600 mx-4">/</span>
            <span class="text-cyan-400">TAILWIND</span>
            <span class="text-gray-600 mx-4">/</span>
            <span class="text-violet-400">DAISYUI</span>
          </h1>
          <div class="text-xs text-gray-500 tracking-widest uppercase mt-4">
            [ FULL-STACK &nbsp;·&nbsp; EDGE-READY &nbsp;·&nbsp; TYPE-SAFE ]
          </div>
          <div class="divider divider-neutral opacity-30" />
          <div class="flex gap-3 justify-center mt-4">
            <kbd class="kbd kbd-sm bg-gray-900 text-green-400 border-gray-700">deno</kbd>
            <kbd class="kbd kbd-sm bg-gray-900 text-cyan-400 border-gray-700">preact</kbd>
            <kbd class="kbd kbd-sm bg-gray-900 text-violet-400 border-gray-700">esbuild</kbd>
            <kbd class="kbd kbd-sm bg-gray-900 text-yellow-400 border-gray-700">ssr</kbd>
          </div>
        </div>
      </div>
    </>
  );
}
