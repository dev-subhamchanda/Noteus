import { useMemo, useState } from 'react';
import { FiArrowDown, FiFolder, FiMoreHorizontal, FiPlus, FiSearch } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import UploadList from '../../components/UploadList';
import type { Semester, UploadRecord } from '../../types/app';

export function NotesPage({
  uploads,
  semesters,
  selectedSemesterId,
  selectedSubjectId,
  onSelectSemester,
  onSelectSubject,
  onUpload,
  token,
}: {
  uploads: UploadRecord[];
  semesters: Semester[];
  selectedSemesterId: string | null;
  selectedSubjectId: string | null;
  onSelectSemester: (semesterId: string | null) => void;
  onSelectSubject: (subjectId: string | null) => void;
  onUpload: () => void;
  token: string;
}) {
  const [search, setSearch] = useState('');
  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId);
  const currentSubject = selectedSemester?.subjects.find((subject) => subject.id === selectedSubjectId);
  const filteredSemesters = useMemo(
    () => semesters.filter((semester) => semester.name.toLowerCase().includes(search.toLowerCase())),
    [search, semesters],
  );
  const filteredSubjects = useMemo(
    () => selectedSemester?.subjects.filter((subject) => subject.name.toLowerCase().includes(search.toLowerCase())) ?? [],
    [search, selectedSemester],
  );
  const subjectUploads = uploads.filter((upload) => (
    upload.subjectId ? upload.subjectId === selectedSubjectId : upload.subject === currentSubject?.name
  ));

  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LEARNING LIBRARY</p>
          <h1>{currentSubject?.name ?? selectedSemester?.name ?? 'My notes'}</h1>
          <p className="page-subtitle">{currentSubject ? 'Your notes, all together in one place.' : selectedSemester ? 'Choose a subject folder to browse its notes.' : 'Browse your semester and subject folders.'}</p>
        </div>
        <button className="primary-button heading-button" onClick={onUpload}><FiPlus /> New upload</button>
      </div>

      {currentSubject && selectedSemester ? (
        <>
          <button className="back-link notes-back" onClick={() => onSelectSubject(null)}><FiArrowDown className="rotate-90" /> {selectedSemester.name}</button>
          {subjectUploads.length ? <UploadList uploads={subjectUploads} token={token} /> : <EmptyState icon={<FiFolder />} title="This folder is ready for your notes" detail={`Upload a PDF to start building your ${currentSubject.name} collection.`} onAction={onUpload} />}
        </>
      ) : selectedSemester ? (
        <>
          <button className="back-link notes-back" onClick={() => onSelectSemester(null)}><FiArrowDown className="rotate-90" /> All semesters</button>
          <div className="library-toolbar">
            <div className="library-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a subject..." aria-label="Find a subject" /></div>
            <span className="folder-count">{filteredSubjects.length} SUBJECT FOLDERS</span>
          </div>
          {filteredSubjects.length ? (
            <div className="folders-grid">
              {filteredSubjects.map((subject) => {
                const count = uploads.filter((upload) => upload.subjectId
                  ? upload.subjectId === subject.id
                  : upload.subject === subject.name).length;
                return (
                  <button className="folder-card" key={subject.id} onClick={() => onSelectSubject(subject.id)}>
                    <div className="folder-card-top"><span className="subject-card-icon violet"><FiFolder /></span><span className="folder-menu"><FiMoreHorizontal /></span></div>
                    <h2>{subject.name}</h2>
                    <p>{count} {count === 1 ? 'note' : 'notes'}</p>
                    <div className="folder-illustration violet"><FiFolder /></div>
                  </button>
                );
              })}
            </div>
          ) : <EmptyState icon={<FiSearch />} title="No subjects found" detail="This semester does not have any matching subjects yet." />}
        </>
      ) : (
        <>
          <div className="library-toolbar">
            <div className="library-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a subject..." aria-label="Find a subject" /></div>
            <span className="folder-count">{filteredSemesters.length} SEMESTER FOLDERS</span>
          </div>
          {filteredSemesters.length ? (
            <div className="folders-grid">
              {filteredSemesters.map((semester) => {
                const count = semester.subjects.length;
                return (
                  <button className="folder-card" key={semester.id} onClick={() => onSelectSemester(semester.id)}>
                    <div className="folder-card-top"><span className="subject-card-icon violet"><FiFolder /></span><span className="folder-menu"><FiMoreHorizontal /></span></div>
                    <h2>{semester.name}</h2>
                    <p>{count} {count === 1 ? 'subject' : 'subjects'}</p>
                    <div className="folder-illustration violet"><FiFolder /></div>
                  </button>
                );
              })}
            </div>
          ) : <EmptyState icon={<FiSearch />} title="No semesters yet" detail="Semester folders created by the admin will appear here." />}
        </>
      )}
    </div>
  );
}
