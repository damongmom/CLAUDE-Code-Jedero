type Handler = (request: Request, context: { params: Record<string, string> }) => Promise<Response>;

/**
 * 라우트 핸들러를 직접 호출하고 { status, body, headers }를 돌려준다.
 * 본문이 비었거나 JSON이 아니면(302 리다이렉트 등) body는 null이다.
 */
export async function call<T = any>(
  handler: Handler,
  options: { path?: string; method?: string; body?: unknown; params?: Record<string, string>; cookie?: string } = {},
): Promise<{ status: number; body: T; headers: Headers }> {
  const { path = '/', method = 'GET', body, params = {}, cookie } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const response = await handler(request, { params });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { status: response.status, body: parsed as T, headers: response.headers };
}
