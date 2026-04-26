import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export interface HowlAttrs {
  id?: string;
}

export function HowlAttrs(props: HowlAttrs) {
  const active = useSignal(false);
  useEffect(() => {
    active.value = true;
  }, []);

  return (
    <div id={props.id} class={active.value ? "ready" : ""}>
      <h1>Howl attrs</h1>
      <div class="f-client-nav-true" f-client-nav>f-client-nav=true</div>
      <div class="f-client-nav-false" f-client-nav={false}>
        f-client-nav=false
      </div>
    </div>
  );
}
