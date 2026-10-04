import { apiBase, readApiResponse } from './api';
import type { Semester } from '../types/app';

export async function loadSemesters(token: string): Promise<Semester[]> {
  const response = await fetch(`${apiBase}/api/notes/semesters`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readApiResponse<{ semesters: Semester[] }>(response, true);
  return data.semesters;
}
