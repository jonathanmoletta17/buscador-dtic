type QueryPrimitive = string | number | boolean | null | undefined;
type QueryValue = QueryPrimitive | QueryPrimitive[];

export type QueryParams = Record<string, QueryValue>;

// Base proxy relative to next.js server
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function resolveRootContext(context: string): string {
  if (context.startsWith("sis")) return "sis";
  if (context.startsWith("dtic")) return "dtic";
  return context;
}

export function buildApiPath(context: string, resource: string): string {
  const rootContext = resolveRootContext(context);
  const normalizedResource = resource.replace(/^\/+/, "");
  return `${NEXT_PUBLIC_API_URL}/api/v1/${rootContext}/${normalizedResource}`;
}

export function withQuery(path: string, params?: QueryParams): string {
  if (!params) {
    return path;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          query.append(key, String(item));
        }
      }
      continue;
    }

    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export async function request<TResponse>(
  url: string,
  config: RequestInit = {}
): Promise<TResponse> {
  // Pure fetch, no authentication headers
  const response = await fetch(url, {
    ...config,
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.error || errorDetail;
    } catch {
      // Ignore JSON parse error if body is empty or not JSON
    }
    throw new Error(`API Error: ${response.status} - ${errorDetail}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as TResponse;
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}

export function apiGet<T>(
  path: string,
  params?: QueryParams,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<T> {
  return request<T>(withQuery(path, params), {
    ...init,
    method: "GET",
  });
}

export function apiPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: Omit<RequestInit, "body" | "method">,
): Promise<TResponse> {
  return request<TResponse>(path, {
    ...init,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: Omit<RequestInit, "body" | "method">,
): Promise<TResponse> {
  return request<TResponse>(path, {
    ...init,
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<TResponse>(
  path: string,
  init?: Omit<RequestInit, "method">,
): Promise<TResponse> {
  return request<TResponse>(path, {
    ...init,
    method: "DELETE",
  });
}
