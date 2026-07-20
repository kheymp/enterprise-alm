const BASE_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('json')) {
      const body = await res.json();

      // ASP.NET validation shape: { errors: { Field: ["message"] } }
      if (body.errors) {
        return Object.values(body.errors as Record<string, string[]>)
          .flat()
          .join(' ');
      }
      return body.title ?? body.message ?? `Request failed (${res.status})`;
    }

    const text = await res.text();
    if (text) return text;
  } catch {
    // The body was empty or unreadable — fall through to the generic message below.
  }

  return `Request failed (${res.status})`;
}

type RequestOptions = RequestInit;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Token expired: only treat a 401 as "expired" if we actually sent a token.
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new ApiError('Your session has expired. Please log in again.', 401);
  }

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }

  // Request succeeded, but there might be no data to read back.
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) return text as T;

  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};