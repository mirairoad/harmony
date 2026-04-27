import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import denoJson from "../deno.json" with { type: "json" };

export const CURRENT_HOWL_VERSION = denoJson.version;

export const tracer = trace.getTracer("howl", CURRENT_HOWL_VERSION);
export { trace };

export function recordSpanError(span: Span, err: unknown) {
  if (err instanceof Error) {
    span.recordException(err);
  } else {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: String(err),
    });
  }
}
