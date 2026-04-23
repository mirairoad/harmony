interface ApiRequestState {
  body?: unknown;
  query?: unknown;
  rawBody?: string;
}

const _map = new WeakMap<object, ApiRequestState>();

export function setApiRequestState(ctx: object, patch: Partial<ApiRequestState>): void {
  _map.set(ctx, { ..._map.get(ctx), ...patch });
}

export function getApiRequestState(ctx: object): ApiRequestState {
  return _map.get(ctx) ?? {};
}
