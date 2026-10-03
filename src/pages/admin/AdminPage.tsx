import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import type { Semester } from '../../types/app';
import ThemeToggle from '../../components/ThemeToggle';
import './admin.css';

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const adminTokenKey = 'noted.admin.token';

type AdminUser = {
  id: string;
  rollNumber: string;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  createdAt: string;
};

type UploadActivity = {
  id: string;
  rollNumber: string;
  email: string;
  firstName?: string;
  semesterName?: string;
  originalName: string;
  subject: string;
  size: number;
  status: 'pending' | 'uploaded' | 'failed' | 'deleted';
  url?: string;
  createdAt: string;
};

type DashboardData = {
  users: AdminUser[];
  uploads: UploadActivity[];
  semesters: Semester[];
};

class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { message?: string };
  if (!response.ok) throw new AdminApiError(data.message || 'The request could not be completed.', response.status);
  return data;
}

async function loadDashboard(token: string): Promise<DashboardData> {
  const headers = { Authorization: `Bearer ${token}` };
  const [usersResponse, activityResponse, semestersResponse] = await Promise.all([
    fetch(`${apiBase}/api/admin/users`, { headers }),
    fetch(`${apiBase}/api/admin/activity`, { headers }),
    fetch(`${apiBase}/api/admin/semesters`, { headers }),
  ]);
  const [users, activity, semesters] = await Promise.all([
    readResponse<{ users: AdminUser[] }>(usersResponse),
    readResponse<{ uploads: UploadActivity[] }>(activityResponse),
    readResponse<{ semesters: Semester[] }>(semestersResponse),
  ]);
  return { users: users.users, uploads: activity.uploads, semesters: semesters.semesters };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSize(size: number): string {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function UsersDialog({
  users,
  loading,
  busy,
  deletingUserId,
  onClose,
  onDelete,
}: {
  users: AdminUser[];
  loading: boolean;
  busy: boolean;
  deletingUserId: string;
  onClose: () => void;
  onDelete: (user: AdminUser) => void;
}) {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    [user.firstName, user.middleName, user.lastName, user.rollNumber, user.email]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch)),
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="admin-users-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-users-title">
        <header className="admin-users-dialog-header">
          <div>
            <h2 id="admin-users-title">Users</h2>
            <p>{users.length} most recently created student accounts</p>
          </div>
          <button className="admin-secondary-button" type="button" onClick={onClose}>Close</button>
        </header>
        <label className="admin-users-search">
          <span>Search by name, roll number, or email</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
            autoFocus
          />
        </label>
        <div className="admin-users-list">
          {loading ? (
            <p className="admin-empty">Loading users…</p>
          ) : filteredUsers.length === 0 ? (
            <p className="admin-empty">{normalizedSearch ? 'No users match your search.' : 'No users yet.'}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Roll number</th><th>Email</th><th>Created</th><th>Action</th></tr></thead>
                <tbody>{filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{[user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Student'}</td>
                    <td>{user.rollNumber}</td>
                    <td>{user.email}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button
                        className="admin-delete-button"
                        type="button"
                        disabled={busy || Boolean(deletingUserId)}
                        onClick={() => onDelete(user)}
                      >
                        {deletingUserId === user.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(adminTokenKey) ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [semesterName, setSemesterName] = useState('');
  const [subjectNames, setSubjectNames] = useState<Record<string, string>>({});
  const [importFailures, setImportFailures] = useState<Array<{ row: number; rollNumber: string; message: string }>>([]);
  const [deletingUserId, setDeletingUserId] = useState('');
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData>({ users: [], uploads: [], semesters: [] });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    loadDashboard(token)
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        toast.error(cause instanceof Error ? cause.message : 'Unable to load admin data.');
        if (cause instanceof AdminApiError && cause.status === 401) {
          localStorage.removeItem(adminTokenKey);
          setToken('');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await readResponse<{ token: string }>(response);
      localStorage.setItem(adminTokenKey, data.token);
      setToken(data.token);
      setPassword('');
      toast.success('Admin signed in.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to connect to the server.');
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          rollNumber: rollNumber.trim(),
          email: email.trim(),
        }),
      });
      const result = await readResponse<{ message: string }>(response);
      toast.success(result.message);
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setRollNumber('');
      setEmail('');
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create the user.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setBusy(false);
    }
  };

  const importUsers = async (file: File) => {
    setBusy(true);
    setImportFailures([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${apiBase}/api/admin/users/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await readResponse<{
        created: number;
        failed: Array<{ row: number; rollNumber: string; message: string }>;
      }>(response);
      if (result.created > 0) toast.success(`Created ${result.created} account${result.created === 1 ? '' : 's'}.`);
      if (result.failed.length > 0) toast.error(`${result.failed.length} CSV row${result.failed.length === 1 ? '' : 's'} could not be imported.`);
      setImportFailures(result.failed);
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to import the CSV file.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    const name = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || user.rollNumber;
    if (!window.confirm(`Delete ${name}'s account? Previously uploaded shared notes will remain available.`)) return;

    setDeletingUserId(user.id);
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await readResponse<{ message: string }>(response);
      toast.success(result.message);
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete the user.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setDeletingUserId('');
    }
  };

  const deleteUpload = async (upload: UploadActivity) => {
    if (!window.confirm(`Permanently delete ${upload.originalName}? It will no longer be available to any user.`)) return;

    setBusyAction(`delete-upload-${upload.id}`);
    try {
      const response = await fetch(`${apiBase}/api/admin/activity/${encodeURIComponent(upload.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await readResponse<{ message: string }>(response);
      toast.success(result.message);
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete the file.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setBusyAction('');
    }
  };

  const createSemester = async (event: FormEvent) => {
    event.preventDefault();
    setBusyAction('semester');
    try {
      const response = await fetch(`${apiBase}/api/admin/semesters`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: semesterName.trim() }),
      });
      const result = await readResponse<{ message: string }>(response);
      toast.success(result.message);
      setSemesterName('');
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create the semester.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setBusyAction('');
    }
  };

  const createSubject = async (event: FormEvent, semesterId: string) => {
    event.preventDefault();
    const name = subjectNames[semesterId]?.trim() ?? '';
    setBusyAction(`subject-${semesterId}`);
    try {
      const response = await fetch(`${apiBase}/api/admin/semesters/${encodeURIComponent(semesterId)}/subjects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await readResponse<{ message: string }>(response);
      toast.success(result.message);
      setSubjectNames((current) => ({ ...current, [semesterId]: '' }));
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create the subject.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setBusyAction('');
    }
  };

  const deleteSubject = async (semester: Semester, subject: Semester['subjects'][number]) => {
    if (!window.confirm(`Delete ${subject.name} from ${semester.name}?`)) return;
    setBusyAction(`delete-subject-${subject.id}`);
    try {
      const response = await fetch(`${apiBase}/api/admin/semesters/${encodeURIComponent(semester.id)}/subjects/${encodeURIComponent(subject.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await readResponse<{ message: string }>(response);
      toast.success(result.message);
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete the subject.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setBusyAction('');
    }
  };

  const deleteSemester = async (semester: Semester) => {
    if (!window.confirm(`Delete ${semester.name}? It must have no uploaded notes.`)) return;
    setBusyAction(`delete-semester-${semester.id}`);
    try {
      const response = await fetch(`${apiBase}/api/admin/semesters/${encodeURIComponent(semester.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await readResponse<{ message: string }>(response);
      toast.success(result.message);
      setDashboard(await loadDashboard(token));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete the semester.');
      if (cause instanceof AdminApiError && cause.status === 401) {
        localStorage.removeItem(adminTokenKey);
        setToken('');
      }
    } finally {
      setBusyAction('');
    }
  };

  const downloadCsvTemplate = () => {
    const template = 'firstName,middleName,lastName,rollNumber,email\r\nAva,,Stone,20260001,ava@example.edu\r\n';
    const url = URL.createObjectURL(new Blob([template], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-accounts-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const signOut = () => {
    localStorage.removeItem(adminTokenKey);
    setToken('');
    setDashboard({ users: [], uploads: [], semesters: [] });
    setImportFailures([]);
    toast.success('Admin signed out.');
  };

  if (!token) {
    return (
      <main className="admin-login-page">
        <ThemeToggle className="admin-theme-toggle" />
        <form className="admin-login-card" onSubmit={signIn}>
          <a className="admin-back-link" href="/">← Back to student sign in</a>
          <p className="admin-eyebrow">NOTEUS ADMIN</p>
          <h1>Admin sign in</h1>
          <p className="admin-muted">Use the admin username and password configured for this server.</p>
          <label htmlFor="admin-username">Username</label>
          <input id="admin-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="admin-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">NOTEUS ADMIN</p>
          <h1>Admin panel</h1>
          <p className="admin-muted">Manage student accounts and review recent uploads.</p>
        </div>
        <div className="admin-header-actions">
          <ThemeToggle />
          <button className="admin-secondary-button" type="button" onClick={() => setUsersDialogOpen(true)}>
            Users ({dashboard.users.length})
          </button>
          <a className="admin-secondary-button" href="/">Student site</a>
          <button className="admin-secondary-button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      {usersDialogOpen && (
        <UsersDialog
          users={dashboard.users}
          loading={loading}
          busy={busy}
          deletingUserId={deletingUserId}
          onClose={() => setUsersDialogOpen(false)}
          onDelete={(user) => void deleteUser(user)}
        />
      )}

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><h2>Create a user</h2><p>We’ll generate a PIN and email it to the user.</p></div>
          <span>{dashboard.users.length} accounts</span>
        </div>
        <form className="admin-create-form" onSubmit={createUser}>
          <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} required /></label>
          <label>Middle name<input value={middleName} onChange={(event) => setMiddleName(event.target.value)} maxLength={80} /></label>
          <label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} required /></label>
          <label>Roll number<input value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} maxLength={64} required /></label>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <button className="admin-button" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><h2>Manage semesters and subjects</h2><p>Create semester folders and add subject folders inside each one.</p></div>
        </div>
        <form className="admin-inline-form" onSubmit={createSemester}>
          <label>New semester<input value={semesterName} onChange={(event) => setSemesterName(event.target.value)} maxLength={80} placeholder="e.g. Semester 1" required /></label>
          <button className="admin-button" disabled={Boolean(busyAction)}>{busyAction === 'semester' ? 'Creating…' : 'Create semester'}</button>
        </form>
        {dashboard.semesters.length === 0 ? <p className="admin-empty">No semesters created yet.</p> : (
          <div className="admin-semester-list">
            {dashboard.semesters.map((semester) => (
              <article className="admin-semester-card" key={semester.id}>
                <div className="admin-semester-heading">
                  <div><h3>{semester.name}</h3><p>{semester.subjects.length} subject{semester.subjects.length === 1 ? '' : 's'}</p></div>
                  <button className="admin-delete-button" type="button" disabled={Boolean(busyAction)} onClick={() => void deleteSemester(semester)}>
                    {busyAction === `delete-semester-${semester.id}` ? 'Deleting…' : 'Delete semester'}
                  </button>
                </div>
                {semester.subjects.length > 0 && (
                  <ul className="admin-subject-list">
                    {semester.subjects.map((subject) => (
                      <li key={subject.id}>
                        <span>{subject.name}</span>
                        <button className="admin-delete-button" type="button" disabled={Boolean(busyAction)} onClick={() => void deleteSubject(semester, subject)}>
                          {busyAction === `delete-subject-${subject.id}` ? 'Deleting…' : 'Delete'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <form className="admin-inline-form admin-subject-form" onSubmit={(event) => void createSubject(event, semester.id)}>
                  <label>Add subject<input value={subjectNames[semester.id] ?? ''} onChange={(event) => setSubjectNames((current) => ({ ...current, [semester.id]: event.target.value }))} maxLength={100} placeholder="e.g. Mathematics" required /></label>
                  <button className="admin-secondary-button" disabled={Boolean(busyAction)}>{busyAction === `subject-${semester.id}` ? 'Adding…' : 'Add subject'}</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><h2>Import users from CSV</h2><p>Upload up to 100 accounts at a time. Each created account receives a PIN by email.</p></div>
          <button className="admin-secondary-button" type="button" onClick={downloadCsvTemplate}>Download CSV template</button>
        </div>
        <label className="admin-file-label">
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void importUsers(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
        <p className="admin-csv-hint">Required columns: firstName, lastName, rollNumber, email. middleName is optional.</p>
        {importFailures.length > 0 && (
          <div className="admin-import-errors" role="status">
            <strong>Rows not imported</strong>
            <ul>{importFailures.map((failure) => (
              <li key={`${failure.row}-${failure.rollNumber}`}>
                Row {failure.row}{failure.rollNumber ? ` (${failure.rollNumber})` : ''}: {failure.message}
              </li>
            ))}</ul>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading"><div><h2>Upload activity</h2><p>Latest 200 upload attempts, including who uploaded each file.</p></div></div>
        {loading ? <p className="admin-empty">Loading activity…</p> : dashboard.uploads.length === 0 ? <p className="admin-empty">No uploads recorded yet.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>File</th><th>Uploaded by</th><th>Subject</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>{dashboard.uploads.map((upload) => (
                <tr key={upload.id}>
                  <td>{upload.url ? <a href={upload.url} target="_blank" rel="noreferrer">{upload.originalName}</a> : upload.originalName}<small>{formatSize(upload.size)}</small></td>
                  <td>{upload.firstName ? `${upload.firstName} · ` : ''}{upload.rollNumber}<small>{upload.email}</small></td>
                  <td>{upload.subject}<small>{upload.semesterName}</small></td>
                  <td><span className={`admin-status ${upload.status}`}>{upload.status}</span></td>
                  <td>{formatDate(upload.createdAt)}</td>
                  <td>{upload.status === 'uploaded' ? (
                    <button
                      className="admin-delete-button"
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => void deleteUpload(upload)}
                    >
                      {busyAction === `delete-upload-${upload.id}` ? 'Deleting…' : 'Delete file'}
                    </button>
                  ) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
