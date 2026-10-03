import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBookOpen,
  FiChevronDown,
  FiGrid,
  FiKey,
  FiLogOut,
  FiPlus,
  FiSearch,
  FiUploadCloud,
} from 'react-icons/fi';
import { toast } from 'sonner';
import { useAuth } from '../app/AuthContext';
import Avatar from '../components/Avatar';
import Brand from '../components/Brand';
import NavItem from '../components/NavItem';
import { UploadModal } from '../components/UploadModal';
import { loadSemesters } from '../services/semester.service';
import { changeUserPin } from '../services/auth.service';
import type { Semester } from '../types/app';

export default function StudentLayout() {
  const { token, user, uploads, setUploads, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  useEffect(() => {
    if (!token) {
      setSemesters([]);
      return;
    }
    let active = true;
    loadSemesters(token)
      .then((data) => {
        if (active) setSemesters(data);
      })
      .catch((cause: unknown) => {
        if (active) toast.error(cause instanceof Error ? cause.message : 'Unable to load semester folders.');
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!user || !token) return null;

  const displayName = user.firstName?.trim() || user.email.split('@')[0].replace(/[._-]/g, ' ').split(' ')[0] || 'Student';
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const initialSemesterId = pathSegments[0] === 'notes' ? pathSegments[1] ?? '' : '';
  const initialSubjectId = pathSegments[0] === 'notes' ? pathSegments[2] ?? '' : '';

  const openNotes = (semesterId?: string, subjectId?: string) => {
    navigate(subjectId ? `/notes/${semesterId}/${subjectId}` : semesterId ? `/notes/${semesterId}` : '/notes');
  };
  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };
  const handlePinChange = async (event: FormEvent) => {
    event.preventDefault();
    if (newPin !== confirmPin) {
      toast.error('New PIN entries do not match.');
      return;
    }

    setPinBusy(true);
    try {
      const result = await changeUserPin(currentPin, newPin, token);
      toast.success(result.message);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setShowPinForm(false);
      setShowProfile(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to change your PIN.');
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="desktop-layout">
        <aside className="sidebar">
          <Brand />
          <p className="nav-label">WORKSPACE</p>
          <nav className="nav-list" aria-label="Main navigation">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-icon"><FiGrid /></span><span>Home</span></NavLink>
            <NavLink to="/notes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-icon"><FiBookOpen /></span><span>My notes</span></NavLink>
            <NavLink to="/uploads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-icon"><FiUploadCloud /></span><span>My uploads</span></NavLink>
          </nav>

          <div className="sidebar-subjects">
            <div className="flex items-center justify-between px-3">
              <p className="nav-label !px-0">SEMESTERS</p>
              <button className="icon-button small" aria-label="Browse subjects" onClick={() => openNotes()}><FiPlus /></button>
            </div>
            {semesters.map((semester) => (
              <div key={semester.id}>
                <button className="subject-nav-item font-semibold" onClick={() => openNotes(semester.id)}>
                  <span className="subject-dot violet" />
                  <span>{semester.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{semester.subjects.length || ''}</span>
                </button>
                {semester.subjects.map((subject) => (
                  <button className="subject-nav-item pl-8" key={subject.id} onClick={() => openNotes(semester.id, subject.id)}>
                    <span className="subject-dot blue" />
                    <span>{subject.name}</span>
                    <span className="ml-auto text-xs text-slate-400">{uploads.filter((file) => file.subjectId === subject.id).length || ''}</span>
                  </button>
                ))}
              </div>
            ))}
            {semesters.length === 0 && <p className="px-3 text-xs text-slate-400">No semesters yet</p>}
          </div>

          <div className="sidebar-bottom">
            <div className="profile-row">
              <Avatar name={displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize">{displayName}</p>
                <p className="truncate text-xs text-slate-500">Roll no. {user.rollNumber}</p>
              </div>
              <button className="icon-button small" aria-label="Sign out" title="Sign out" onClick={handleSignOut}><FiLogOut /></button>
            </div>
          </div>
        </aside>

        <div className="app-content">
          <header className="topbar">
            <div className="topbar-mobile-brand"><Brand /></div>
            <div className="topbar-search">
              <FiSearch className="text-slate-400" />
              <input aria-label="Search" placeholder="Search notes, subjects, and more..." onKeyDown={(event) => {
                if (event.key === 'Enter') openNotes();
              }} />
              <kbd>⌘ K</kbd>
            </div>
            <div className="topbar-actions">
              <button className="icon-button notification-button" aria-label="Notifications" onClick={() => navigate('/')}><FiBell /><span /></button>
              <div className="topbar-divider" />
              <button className="user-menu" onClick={() => setShowProfile((open) => !open)} aria-expanded={showProfile} aria-label="Open user profile">
                <Avatar name={displayName} />
                <span className="hidden sm:block text-left">
                  <span className="block text-sm font-semibold capitalize">{displayName}</span>
                  <span className="block text-xs text-slate-500">Student account</span>
                </span>
                <FiChevronDown className="hidden text-slate-400 sm:block" />
              </button>
              {showProfile && (
                <div className="profile-popover">
                  <div className="profile-popover-user"><Avatar name={displayName} /><div className="min-w-0"><strong className="block truncate capitalize">{displayName}</strong><span className="block truncate">{user.rollNumber}</span></div></div>
                  {!showPinForm ? (
                    <>
                      <button onClick={() => setShowPinForm(true)}><FiKey /> Change PIN</button>
                      <button onClick={handleSignOut}><FiLogOut /> Sign out</button>
                    </>
                  ) : (
                    <form className="pin-change-form" onSubmit={handlePinChange}>
                      <label>Current PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="current-password" value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))} required /></label>
                      <p className="pin-change-hint">Use the PIN emailed to you if you have not changed it before.</p>
                      <label>New PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))} required /></label>
                      <label>Confirm new PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} required /></label>
                      <button type="submit" disabled={pinBusy}>{pinBusy ? 'Updating…' : 'Update PIN'}</button>
                      <button type="button" onClick={() => { setShowPinForm(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); }}>Cancel</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </header>

          <main className="main-content">
            <Outlet context={{ onUpload: () => setShowUpload(true), semesters }} />
          </main>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavItem active={location.pathname === '/'} icon={<FiGrid />} label="Home" onClick={() => navigate('/')} />
        <NavItem active={location.pathname.startsWith('/notes')} icon={<FiBookOpen />} label="Notes" onClick={() => openNotes()} />
        <NavItem active={location.pathname === '/uploads'} icon={<FiUploadCloud />} label="Uploads" onClick={() => navigate('/uploads')} />
      </nav>

      {showUpload && (
        <UploadModal
          token={token}
          semesters={semesters}
          initialSemesterId={initialSemesterId}
          initialSubjectId={initialSubjectId}
          onClose={() => setShowUpload(false)}
          onUploaded={(record) => {
            setUploads((current) => [record, ...current]);
            setShowUpload(false);
            navigate('/uploads');
          }}
        />
      )}
    </div>
  );
}
