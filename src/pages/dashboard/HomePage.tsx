import { useState } from 'react';
import type { ReactNode } from 'react';
import { FiArrowRight, FiBell, FiCheck, FiCheckCircle, FiClock, FiFileText, FiFolder, FiMoreHorizontal, FiPlus } from 'react-icons/fi';
import { tasks } from '../../data/dashboard';
import type { AppView, Semester, UploadRecord } from '../../types/app';
import { getGreeting } from '../../utils/format';

export function HomePage({ displayName, uploads, semesters, recentUploads, notificationPermission, onEnableNotifications, onNavigate, onOpenSemester, onOpenUpload, onUpload }: {
  displayName: string;
  uploads: UploadRecord[];
  semesters: Semester[];
  recentUploads: UploadRecord[];
  notificationPermission: NotificationPermission | 'unsupported';
  onEnableNotifications: () => void;
  onNavigate: (view: AppView) => void;
  onOpenSemester: (semesterId: string) => void;
  onOpenUpload: (upload: UploadRecord) => void;
  onUpload: () => void;
}) {
  const [homeTasks, setHomeTasks] = useState(tasks);
  const currentTasks = homeTasks.filter((task) => !task.done);

  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()}</p>
          <h1>{getGreeting()}, <span className="capitalize">{displayName}</span> <span className="wave">✦</span></h1>
          <p className="page-subtitle">Here’s your learning space at a glance.</p>
        </div>
        <button className="primary-button heading-button" onClick={onUpload}><FiPlus /> New upload</button>
      </div>

      <section className="panel notifications-panel recent-activity-panel">
        <div className="section-heading">
          <div><h2>Recent activity <span className="notification-count">{recentUploads.length}</span></h2><p>Notes uploaded in the last 3 days.</p></div>
          <button
            type="button"
            className="notification-permission-button"
            onClick={onEnableNotifications}
            disabled={notificationPermission === 'granted' || notificationPermission === 'denied' || notificationPermission === 'unsupported'}
            title={notificationPermission === 'denied' ? 'Allow notifications in your browser settings' : undefined}
          >
            <FiBell />
            {notificationPermission === 'granted' ? 'Browser alerts on' : notificationPermission === 'denied' ? 'Alerts blocked' : notificationPermission === 'unsupported' ? 'Alerts unavailable' : 'Enable browser alerts'}
          </button>
        </div>
        <div className="notification-list">
          {recentUploads.map((upload) => (
            <button className="notification-row" type="button" key={upload.id} onClick={() => onOpenUpload(upload)}>
              <span className="notification-icon purple"><FiBell /></span>
              <span className="min-w-0 flex-1">
                <span className="notification-title">{upload.name}</span>
                <span className="notification-detail">{upload.uploadedBy || 'Uploader name unavailable'} uploaded to {upload.subject}{upload.semesterName ? ` · ${upload.semesterName}` : ''}</span>
                <small>{new Date(upload.uploadedAt).toLocaleString()}</small>
              </span>
              <span className="unread-dot" />
            </button>
          ))}
          {!recentUploads.length && <p className="notification-empty">No notes were uploaded in the last 3 days.</p>}
        </div>
        <button className="all-updates" onClick={() => onNavigate('notes')}>Browse shared notes <FiArrowRight /></button>
      </section>

      <section className="welcome-banner">
        <div className="banner-copy">
          <span className="banner-kicker">A FRESH WEEK, A FRESH START</span>
          <h2>Small steps add up<br className="hidden sm:block" /> to big ideas.</h2>
          <p>You’ve got this. Let’s make today count.</p>
          <button className="banner-button" onClick={() => onNavigate('notes')}>Explore your notes <FiArrowRight /></button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-blob art-blob-back" />
          <div className="art-book art-book-back"><span /></div>
          <div className="art-book art-book-front"><span /><i /><i /><i /></div>
          <div className="art-star star-one">✳</div><div className="art-star star-two">✦</div>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon={<FiFolder />} label="My subjects" value={String(semesters.reduce((count, semester) => count + semester.subjects.length, 0)).padStart(2, '0')} meta="Stay organized" tone="violet" />
        <StatCard icon={<FiFileText />} label="Uploaded notes" value={String(uploads.length).padStart(2, '0')} meta="Across all subjects" tone="blue" />
        <StatCard icon={<FiCheckCircle />} label="Tasks to focus on" value={String(currentTasks.length).padStart(2, '0')} meta="You’re on track" tone="orange" />
        <StatCard icon={<FiClock />} label="Study streak" value="04 days" meta="Keep it going!" tone="green" />
      </div>

      <div className="home-columns">
        <section className="panel">
          <div className="section-heading">
            <div><h2>Up next</h2><p>A little progress goes a long way.</p></div>
            <button className="subtle-link" onClick={() => onNavigate('home')}>See calendar <FiArrowRight /></button>
          </div>
          <div className="task-list">
            {homeTasks.map((task, index) => (
              <div className={`task-row ${task.done ? 'task-complete' : ''}`} key={task.title}>
                <button className="task-check" aria-label={task.done ? 'Mark task incomplete' : 'Mark task complete'} onClick={() => setHomeTasks((current) => current.map((item) => item.title === task.title ? { ...item, done: !item.done } : item))}><FiCheck /></button>
                <div className={`task-date date-${index}`}><span>{index === 0 ? '02' : index === 1 ? '03' : '05'}</span><small>{index === 2 ? 'FRI' : index === 1 ? 'THU' : 'WED'}</small></div>
                <div className="min-w-0 flex-1"><h3>{task.title}</h3><p>{task.subject}</p></div>
                <span className={`task-due ${index === 0 ? 'due-soon' : ''}`}>{task.due}</span>
                <button className="icon-button small more-button" aria-label="More task options"><FiMoreHorizontal /></button>
              </div>
            ))}
          </div>
        </section>

      </div>

      <section className="subject-section">
        <div className="section-heading">
          <div><h2>Your semesters</h2><p>Open a semester to browse its subject folders.</p></div>
          <button className="subtle-link" onClick={() => onNavigate('notes')}>All subjects <FiArrowRight /></button>
        </div>
        <div className="subject-grid">
          {semesters.slice(0, 4).map((semester) => (
            <button className="subject-card" key={semester.id} onClick={() => onOpenSemester(semester.id)}>
              <span className="subject-card-icon violet"><FiFolder /></span>
              <span className="subject-card-name">{semester.name}</span>
              <span className="subject-card-meta">{semester.subjects.length} subjects</span>
              <span className="subject-card-arrow"><FiArrowRight /></span>
            </button>
          ))}
        </div>
        {semesters.length === 0 && <p className="page-subtitle">Semester folders will appear here once they are created by the admin.</p>}
      </section>
    </div>
  );
}

export function StatCard({ icon, label, value, meta, tone }: { icon: ReactNode; label: string; value: string; meta: string; tone: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <p className="stat-label">{label}</p>
      <div className="stat-value">{value}</div>
      <p className="stat-meta">{meta}</p>
    </div>
  );
}
