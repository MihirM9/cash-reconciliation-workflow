const CURRENT_USER_KEY = "sec-workflow.currentUserId";

export function getCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

export function setCurrentUserId(id: string | null): void {
  if (id) localStorage.setItem(CURRENT_USER_KEY, id);
  else localStorage.removeItem(CURRENT_USER_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const uid = getCurrentUserId();
  if (uid) headers["x-user-id"] = uid;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const err = (await res.json()) as { error?: string; issues?: unknown };
      if (err.error) message = err.error;
      if (err.issues) message += ` (${JSON.stringify(err.issues)})`;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};
