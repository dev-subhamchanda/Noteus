export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const invalidAuthEvent = 'noted:invalid-auth';

export class ApiResponseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

export async function readApiResponse<T>(response: Response, authenticated = false): Promise<T> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      if (authenticated && response.status === 401) {
        window.dispatchEvent(new Event(invalidAuthEvent));
      }
      throw new ApiResponseError(
        `The server returned an unexpected response (HTTP ${response.status}).`,
        response.status,
      );
    }
    throw new ApiResponseError('The server returned an invalid JSON response.', response.status);
  }

  if (!response.ok) {
    if (authenticated && response.status === 401) {
      window.dispatchEvent(new Event(invalidAuthEvent));
    }
    const message = typeof data === 'object' && data !== null && 'message' in data &&
      typeof data.message === 'string'
      ? data.message
      : `The request could not be completed (HTTP ${response.status}).`;
    throw new ApiResponseError(message, response.status);
  }
  return data as T;
}
