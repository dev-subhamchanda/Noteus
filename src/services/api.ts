export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function readApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message || 'The request could not be completed.');
  }
  return data;
}
