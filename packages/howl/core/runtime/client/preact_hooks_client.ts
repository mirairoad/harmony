import { options as preactOptions } from "preact";
import {
  assetHashingHook,
  CLIENT_NAV_ATTR,
  type InternalPreactOptions,
  OptionsType,
} from "../shared_internal.ts";
import { BUILD_ID } from "../../../utils/build-id.ts";

// deno-lint-ignore no-explicit-any
const options: InternalPreactOptions = preactOptions as any;

const oldVNodeHook = options.vnode;
options.vnode = (vnode) => {
  assetHashingHook(vnode, BUILD_ID);

  if (typeof vnode.type === "string") {
    if (CLIENT_NAV_ATTR in vnode.props) {
      const value = vnode.props[CLIENT_NAV_ATTR];
      if (typeof value === "boolean") {
        vnode.props[CLIENT_NAV_ATTR] = String(value);
      }
    }
  }

  oldVNodeHook?.(vnode);
};

const oldDiff = options[OptionsType.DIFF];
options[OptionsType.DIFF] = (vnode) => {
  oldDiff?.(vnode);
};
