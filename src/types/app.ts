export type User = {
  rollNumber: string;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
};

export type UploadRecord = {
  id: string;
  name: string;
  subject: string;
  subjectId?: string;
  semesterId?: string;
  semesterName?: string;
  url: string;
  publicId: string;
  size: number;
  uploadedAt: string;
};

export type Semester = {
  id: string;
  name: string;
  subjects: Array<{ id: string; name: string }>;
};

export type AppView = 'home' | 'notes' | 'uploads';
