// howl.config.ts always exports State
// import { defineConfig } from "@hushkey/howl";

type User = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
};
export interface UserContext {
  impersonatedUser?: User;
  user?: User;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}
export interface State {
  userContext?: UserContext;
  text: string;
}

// Only export roles/config if using the API layer
export const roles = ["USER", "ADMIN", "SUPER_ADMIN", "SYSTEM", "PUBLISHER"] as const;
export type Role = typeof roles[number];
// export default defineConfig<State, Role>({ ... });
