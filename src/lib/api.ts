const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const token = typeof window !== "undefined" ? localStorage.getItem("sf_token") : null

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Only auto-logout on 401 for non-auth endpoints
    if (res.status === 401 && !path.includes('/auth/')) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("sf_token")
        localStorage.removeItem("sf_user")
        window.location.href = "/login"
      }
    }
    throw { status: res.status, ...json }
  }

  return json as T
}

export const api = {
  get:    <T>(path: string, opts?: RequestOptions) => request<T>(path, { method: "GET", ...opts }),
  post:   <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: "POST", body, ...opts }),
  put:    <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { method: "PUT", body, ...opts }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { method: "DELETE", ...opts }),
}
