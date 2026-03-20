import type { OpenAPIV3_1 } from "openapi-types";

let _spec: OpenAPIV3_1.Document | null = null;

/** @internal — called by apiHandler after registering routes */
export function setApiSpec(spec: OpenAPIV3_1.Document): void {
  _spec = spec;
}

/** Returns the generated OpenAPI spec, or null if APIs haven't been registered yet. */
export function getApiSpecs(): OpenAPIV3_1.Document | null {
  return _spec;
}
