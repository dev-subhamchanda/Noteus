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
import ThemeToggle from '../components/ThemeToggle';
import { loadSemesters } from '../services/semester.service';
import { changeUserPin } from '../services/auth.service';
import { loadRecentNotes, loadSharedNotes, streamNoteNotifications } from '../services/notes.service';
import { ApiResponseError } from '../services/api';
import type { Semester, UploadRecord } from '../types/app';

const recentActivityWindow = 3 * 24 * 60 * 60 * 1000;

function mergeRecentUploads(current: UploadRecord[], incoming: UploadRecord[]): UploadRecord[] {
  const cutoff = Date.now() - recentActivityWindow;
  const uploadsById = new Map(current.map((upload) => [upload.id, upload]));
  for (const upload of incoming) uploadsById.set(upload.id, upload);
  return [...uploadsById.values()]
    .filter((upload) => new Date(upload.uploadedAt).getTime() >= cutoff)
    .sort((first, second) => new Date(second.uploadedAt).getTime() - new Date(first.uploadedAt).getTime())
    .slice(0, 500);
}

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
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    () => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const showRequestError = (cause: unknown, fallback: string) => {
    if (cause instanceof ApiResponseError && cause.status === 401) return;
    toast.error(cause instanceof Error ? cause.message : fallback);
  };

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
        if (active) showRequestError(cause, 'Unable to load semester folders.');
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setRecentUploads([]);
      return;
    }

    const controller = new AbortController();
    let active = true;
    let connectionErrorShown = false;

    const knownUploadIds = new Set<string>();
    const notifyUpload = (upload: UploadRecord) => {
      if (knownUploadIds.has(upload.id)) return;
      knownUploadIds.add(upload.id);
      setRecentUploads((current) => mergeRecentUploads(current, [upload]));
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('New notes uploaded', {
            body: `${upload.uploadedBy ?? 'A student'} uploaded ${upload.name} to ${upload.subject}.`,
            tag: upload.id,
          });
        } catch (cause) {
          console.error('Unable to show browser notification:', cause);
        }
      }
    };
    const wait = (milliseconds: number) => new Promise<void>((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });

    const connect = async () => {
      let initialUploads: UploadRecord[];
      try {
        initialUploads = await loadRecentNotes(token);
      } catch (cause) {
        if (cause instanceof ApiResponseError && cause.status === 404) {
          try {
            const sharedNotes = await loadSharedNotes(token);
            const cutoff = Date.now() - recentActivityWindow;
            initialUploads = sharedNotes.filter((upload) => new Date(upload.uploadedAt).getTime() >= cutoff);
          } catch (fallbackCause) {
            if (active) showRequestError(fallbackCause, 'Unable to load recent activity.');
            return;
          }
        } else {
          if (active) showRequestError(cause, 'Unable to load recent activity.');
          return;
        }
      }
      if (!active) return;
      initialUploads.forEach((upload) => knownUploadIds.add(upload.id));
      setRecentUploads((current) => mergeRecentUploads(current, initialUploads));

      let usePolling = false;
      let retryDelay = 1_000;
      while (active) {
        if (usePolling) {
          await wait(30_000);
          if (!active) return;
          try {
            const uploads = await loadSharedNotes(token);
            uploads
              .filter((upload) => new Date(upload.uploadedAt).getTime() >= Date.now() - recentActivityWindow)
              .forEach(notifyUpload);
          } catch (cause) {
            if (cause instanceof ApiResponseError && cause.status === 401) return;
            if (!connectionErrorShown) {
              showRequestError(cause, 'Unable to refresh recent activity.');
              connectionErrorShown = true;
            }
          }
          continue;
        }

        try {
          await streamNoteNotifications(token, controller.signal, notifyUpload);
          throw new Error('The live notification stream ended.');
        } catch (cause) {
          if (!active || controller.signal.aborted) return;
          if (cause instanceof ApiResponseError && cause.status === 404) {
            usePolling = true;
            continue;
          }
          if (cause instanceof ApiResponseError && cause.status === 401) return;
          if (!connectionErrorShown) {
            showRequestError(cause, 'Live notifications disconnected; retrying.');
            connectionErrorShown = true;
          }
          await wait(retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30_000);
        }
      }
    };

    void connect();
    return () => {
      active = false;
      controller.abort();
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
  const enableBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') toast.success('Browser notifications are enabled.');
      else if (permission === 'denied') toast.error('Browser notifications are blocked. Update this site’s permissions in your browser settings.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to request browser notification permission.');
    }
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
    <div className="app-shell min-h-screen">
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
              <ThemeToggle />
              <button className="icon-button notification-button" aria-label="View recent notifications" onClick={() => navigate('/')}><FiBell />{recentUploads.length > 0 && <span />}</button>
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
            <Outlet context={{ onUpload: () => setShowUpload(true), semesters, recentUploads, notificationPermission, onEnableNotifications: enableBrowserNotifications }} />
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
