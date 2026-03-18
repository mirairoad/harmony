import { Partial } from "../../core/runtime/shared.ts";

export function PartialInIsland() {
  return (
    <Partial name="invalid">
      <p class="invalid">invalid</p>
    </Partial>
  );
}
