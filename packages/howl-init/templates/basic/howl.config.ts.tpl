import { defineConfig, memoryCache } from "@hushkey/howl/api";

export interface State {
  text?: string;
}

export const roles = ["USER"] as const;
export type Role = typeof roles[number];

export const { defineApi, config: apiConfig } = defineConfig<State, Role>({
  roles,
  cache: memoryCache({ maxSize: 1000 }),
});
