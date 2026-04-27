import { useEffect, useState } from "preact/hooks";
import { Head } from "../../../core/runtime/head.ts";

export function TemplateIsland() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div class={ready ? "ready" : ""}>
      <Head>
        <template key="a">ok</template>
      </Head>
    </div>
  );
}
