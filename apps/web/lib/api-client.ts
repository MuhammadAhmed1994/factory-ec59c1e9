const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export type ApiRequestOptions = Omit<RequestInit, 'credentials'>

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/** Calls the API while forwarding the browser's HttpOnly session cookie. */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const detail: unknown = await response.json().catch(() => undefined)
    const message =
      typeof detail === 'object' && detail !== null && 'message' in detail && typeof detail.message === 'string'
        ? detail.message
        : `API request failed (${response.status})`
    throw new ApiError(response.status, message, detail)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
