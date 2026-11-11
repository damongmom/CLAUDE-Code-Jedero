type Handler = (request: Request, context: { params: Record<string, string> }) => Promise<Response>;

/** 라우트 핸들러를 직접 호출하고 { status, body }를 돌려준다. */
export async function call<T = any>(
  handler: Handler,
  options: { path?: string; method?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<{ status: number; body: T }> {
  const { path = '/', method = 'GET', body, params = {} } = options;
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const response = await handler(request, { params });
  return { status: response.status, body: (await response.json()) as T };
}
