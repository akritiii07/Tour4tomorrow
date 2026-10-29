// One tiny wrapper around fetch() used by the whole app.
//  • adds the /api base URL
//  • sends the auth cookie (credentials: 'include')
//  • turns error responses into thrown Errors with a readable message
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, query } = {}) {
  let url = BASE + path;
  if (query) url += `?${new URLSearchParams(query)}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running on port 5000?');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* some responses have no JSON body */
  }

  if (!res.ok) {
    const fallback = res.status >= 500 ? 'Server error — check the backend terminal' : `Request failed (${res.status})`;
    throw new ApiError(res.status, data?.error || fallback, data?.details);
  }
  return data;
}
