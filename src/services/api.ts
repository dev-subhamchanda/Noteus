export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const invalidAuthEvent = 'noted:invalid-auth';

export async function readApiResponse<T>(response: Response, authenticated = false): Promise<T> {
  const data = await response.json() as T & { message?: string };
  if (!response.ok) {
    if (authenticated && response.status === 401) {
      window.dispatchEvent(new Event(invalidAuthEvent));
    }
    throw new Error(data.message || 'The request could not be completed.');
  }
  return data;
}
