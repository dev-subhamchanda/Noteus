import { apiBase, readApiResponse } from './api';
import type { Semester, UploadRecord } from '../types/app';

export async function loadSharedNotes(token: string): Promise<UploadRecord[]> {
  const response = await fetch(`${apiBase}/api/notes/shared`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readApiResponse<{ notes: UploadRecord[] }>(response, true);
  return data.notes;
}

export async function streamNoteNotifications(
  token: string,
  signal: AbortSignal,
  onUpload: (upload: UploadRecord) => void,
): Promise<void> {
  const response = await fetch(`${apiBase}/api/notes/events`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) {
    await readApiResponse<never>(response, true);
    throw new Error('Unable to connect to live notifications.');
  }
  if (!response.body) throw new Error('The server does not support live notifications.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length) onUpload(JSON.parse(dataLines.join('\n')) as UploadRecord);
    dataLines = [];
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line) {
          dispatch();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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
    uploadedBy: string;
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
    uploadedBy: data.file.uploadedBy,
  };
}
