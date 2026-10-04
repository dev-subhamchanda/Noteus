import { apiBase, readApiResponse } from './api';
import type { Semester, UploadRecord } from '../types/app';

export async function loadSharedNotes(token: string): Promise<UploadRecord[]> {
  const response = await fetch(`${apiBase}/api/notes/shared`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readApiResponse<{ notes: UploadRecord[] }>(response, true);
  return data.notes;
}

export async function getNoteAccessUrl(
  publicId: string,
  mode: 'view' | 'download',
  token: string,
): Promise<string> {
  const response = await fetch(`${apiBase}/api/notes/access-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ publicId, mode }),
  });
  const data = await readApiResponse<{ url: string }>(response, true);
  return data.url;
}

type UploadedFileResponse = {
  file: {
    url: string;
    publicId: string;
    title: string;
    size: number;
    uploadedAt?: string;
  };
};

export async function uploadNote(
  file: File,
  title: string,
  semester: Semester,
  subject: Semester['subjects'][number],
  token: string,
): Promise<UploadRecord> {
  const body = new FormData();
  body.append('file', file);
  body.append('title', title);
  body.append('semesterId', semester.id);
  body.append('subjectId', subject.id);

  const response = await fetch(`${apiBase}/api/notes/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const data = await readApiResponse<UploadedFileResponse>(response, true);

  return {
    id: `${data.file.publicId}-${Date.now()}`,
    name: data.file.title,
    subject: subject.name,
    subjectId: subject.id,
    semesterId: semester.id,
    semesterName: semester.name,
    url: data.file.url,
    publicId: data.file.publicId,
    size: data.file.size,
    uploadedAt: data.file.uploadedAt ?? new Date().toISOString(),
  };
}
