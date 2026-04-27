import type { AnyApiDefinition } from "./types.ts";
import { resolvePath } from "./resolve-path.ts";
import { z } from "zod";
import type { OpenAPIV3_1 } from "openapi-types";

function zodToSchema(schema: unknown): Record<string, unknown> {
  try {
    // deno-lint-ignore no-explicit-any
    const json = z.toJSONSchema(schema as z.ZodTypeAny, {
      target: "openapi-3.0",
    });
    // deno-lint-ignore no-explicit-any
    const clean: any = { ...json };
    delete clean.$schema;
    return clean;
  } catch {
    return { type: "object" };
  }
}

// deno-lint-ignore no-explicit-any
function buildResponses(responses: Record<number, any> | undefined): OpenAPIV3_1.ResponsesObject {
  if (!responses) return { "200": { description: "Success" } };
  const out: OpenAPIV3_1.ResponsesObject = {};
  for (const [status, schema] of Object.entries(responses)) {
    out[status] = {
      description: "Response",
      content: {
        "application/json": {
          schema: zodToSchema(schema) as OpenAPIV3_1.SchemaObject,
        },
      },
    };
  }
  return out;
}

/**
 * Generate OpenAPI 3.1 specification from API definitions.
 * Automatically called by apiHandler and exposed at /api/docs.
 */
export function generateOpenApiSpec(
  apis: AnyApiDefinition[],
  options: {
    title?: string;
    version?: string;
    description?: string;
  } = {},
): OpenAPIV3_1.Document {
  const paths: OpenAPIV3_1.PathsObject = {};

  for (const api of apis) {
    const method = api.method.toLowerCase() as Lowercase<typeof api.method>;
    const resolved = resolvePath(api);
    const apiPaths = Array.isArray(resolved) ? resolved : [resolved];

    for (const rawPath of apiPaths) {
      const openApiPath = rawPath.replace(/:([^/]+)/g, "{$1}");
      if (!paths[openApiPath]) paths[openApiPath] = {};

      const isProtected = api.roles?.length > 0;

      const operation: OpenAPIV3_1.OperationObject = {
        summary: api.name,
        description: [
          api.description ?? "",
          isProtected ? `**Roles required:** ${api.roles.join(", ")}` : "**Public route**",
        ].filter(Boolean).join("\n\n"),
        tags: [api.directory],
        responses: buildResponses(api.responses),
        ...(isProtected ? { security: [{ bearerAuth: [] }] } : {}),
      };

      // Path params
      if (api.params instanceof z.ZodObject) {
        operation.parameters = Object.entries(api.params.shape).map(
          ([name, schema]): OpenAPIV3_1.ParameterObject => ({
            name,
            in: "path",
            required: true,
            // deno-lint-ignore no-explicit-any
            schema: zodToSchema(schema) as any,
          }),
        );
      }

      // Query params
      if (api.query instanceof z.ZodObject) {
        const queryParams = Object.entries(api.query.shape).map(
          ([name, schema]): OpenAPIV3_1.ParameterObject => ({
            name,
            in: "query",
            required: !(schema as z.ZodTypeAny).isOptional(),
            // deno-lint-ignore no-explicit-any
            schema: zodToSchema(schema) as any,
          }),
        );
        operation.parameters = [...(operation.parameters ?? []), ...queryParams];
      }

      // Request body
      if (api.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: zodToSchema(api.requestBody) as OpenAPIV3_1.SchemaObject,
            },
          },
        };
      }

      // deno-lint-ignore no-explicit-any
      (paths[openApiPath] as any)[method] = operation;
    }
  }

  return {
    openapi: "3.1.0",
    info: {
      title: options.title ?? "Howl API",
      version: options.version ?? "0.1.0",
      description: options.description ?? "",
    },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
}
