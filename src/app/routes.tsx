import { Navigate, Outlet, Route, Routes, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoginPage } from '../pages/auth/LoginPage';
import { HomePage } from '../pages/dashboard/HomePage';
import { NotesPage } from '../pages/library/NotesPage';
import { UploadsPage } from '../pages/library/MyUploadsPage';
import StudentLayout from '../layouts/StudentLayout';
import AdminPage from '../pages/admin/AdminPage';
import type { AppView, Semester } from '../types/app';

type StudentLayoutContext = { onUpload: () => void; semesters: Semester[] };

function RequireStudent() {
  const { token, user } = useAuth();
  return token && user ? <Outlet /> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { token, user, signIn } = useAuth();
  if (token && user) return <Navigate to="/" replace />;
  return <LoginPage onLogin={signIn} />;
}

function DashboardRoute() {
  const { user, uploads } = useAuth();
  const { onUpload, semesters } = useOutletContext<StudentLayoutContext>();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;

  const displayName = user.firstName?.trim() || user.email.split('@')[0].replace(/[._-]/g, ' ').split(' ')[0] || 'Student';
  const onNavigate = (view: AppView) => navigate(view === 'home' ? '/' : view === 'uploads' ? '/uploads' : '/notes');
  return (
    <HomePage
      displayName={displayName}
      uploads={uploads}
      semesters={semesters}
      onNavigate={onNavigate}
      onOpenSemester={(semesterId) => navigate(`/notes/${semesterId}`)}
      onUpload={onUpload}
    />
  );
}

function NotesRoute() {
  const { semesterId, subjectId } = useParams();
  const { token } = useAuth();
  const { onUpload, semesters } = useOutletContext<StudentLayoutContext>();
  const navigate = useNavigate();

  return (
    <NotesPage
      semesters={semesters}
      selectedSemesterId={semesterId ?? null}
      selectedSubjectId={subjectId ?? null}
      onSelectSemester={(selected) => navigate(selected ? `/notes/${selected}` : '/notes')}
      onSelectSubject={(selected) => navigate(selected && semesterId ? `/notes/${semesterId}/${selected}` : semesterId ? `/notes/${semesterId}` : '/notes')}
      onUpload={onUpload}
      token={token}
    />
  );
}

function UploadsRoute() {
  const { uploads, token } = useAuth();
  const { onUpload } = useOutletContext<StudentLayoutContext>();
  return <UploadsPage uploads={uploads} token={token} onUpload={onUpload} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/admin/*" element={<AdminPage />} />
      <Route element={<RequireStudent />}>
        <Route element={<StudentLayout />}>
          <Route index element={<DashboardRoute />} />
          <Route path="notes" element={<NotesRoute />} />
          <Route path="notes/:semesterId" element={<NotesRoute />} />
          <Route path="notes/:semesterId/:subjectId" element={<NotesRoute />} />
          <Route path="uploads" element={<UploadsRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
