import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FiArrowRight, FiClock, FiFileText, FiUploadCloud, FiX } from 'react-icons/fi';
import { toast } from 'sonner';
import { uploadNote } from '../services/notes.service';
import type { Semester, UploadRecord } from '../types/app';
import { formatSize } from '../utils/format';

export function UploadModal({ token, semesters, initialSemesterId, initialSubjectId, onClose, onUploaded }: {
  token: string;
  semesters: Semester[];
  initialSemesterId: string;
  initialSubjectId: string;
  onClose: () => void;
  onUploaded: (record: UploadRecord) => void;
}) {
  const [semesterId, setSemesterId] = useState(initialSemesterId || semesters[0]?.id || '');
  const currentSemester = useMemo(() => semesters.find((semester) => semester.id === semesterId), [semesterId, semesters]);
  const [subjectId, setSubjectId] = useState(initialSubjectId || currentSemester?.subjects[0]?.id || '');
  const currentSubject = currentSemester?.subjects.find((subject) => subject.id === subjectId);
  const [file, setFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!semesters.some((semester) => semester.id === semesterId)) {
      setSemesterId(semesters[0]?.id ?? '');
    }
  }, [semesterId, semesters]);

  useEffect(() => {
    if (!currentSemester?.subjects.some((subject) => subject.id === subjectId)) {
      setSubjectId(currentSemester?.subjects[0]?.id ?? '');
    }
  }, [currentSemester, subjectId]);

  const pickFile = (picked: File | undefined) => {
    setError('');
    if (!picked) return;
    if (picked.type !== 'application/pdf' || !picked.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      setFileTitle('');
      setError('Choose a PDF file to upload.');
      return;
    }
    if (picked.size > 3 * 1024 * 1024) {
      setFile(null);
      setFileTitle('');
      setError('This file is over the 3 MB upload limit.');
      return;
    }
    setFile(picked);
    setFileTitle(picked.name);
  };

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !currentSemester || !currentSubject || !fileTitle.trim()) {
      setError(!file
        ? 'Choose a PDF file to upload.'
        : !fileTitle.trim()
          ? 'Enter a title for this PDF.'
          : 'Choose a semester and subject before uploading.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const record = await uploadNote(file, fileTitle.trim(), currentSemester, currentSubject, token);
      toast.success('Notes uploaded successfully');
      onUploaded(record);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to connect to the server.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-heading">
        <div className="modal-heading">
          <div><p className="eyebrow">ADD TO YOUR LIBRARY</p><h2 id="upload-heading">Upload new notes</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close upload dialog"><FiX /></button>
        </div>
        <p className="modal-description">Keep your study materials together. Choose a semester and subject, then add a PDF.</p>
        <form onSubmit={upload}>
          <label className="modal-label" htmlFor="semester-select">Semester folder</label>
          <select
            id="semester-select"
            className="subject-select"
            value={semesterId}
            disabled={!semesters.length}
            onChange={(event) => {
              setSemesterId(event.target.value);
              setSubjectId('');
            }}
          >
            {semesters.length
              ? semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)
              : <option value="">No semesters available</option>}
          </select>
          <label className="modal-label" htmlFor="subject-select">Subject folder</label>
          <select
            id="subject-select"
            className="subject-select"
            value={subjectId}
            disabled={!currentSemester?.subjects.length}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            {currentSemester?.subjects.length
              ? currentSemester.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)
              : <option value="">No subjects in this semester</option>}
          </select>
          <label className="modal-label" htmlFor="file-title">File title</label>
          <input
            id="file-title"
            className="subject-select"
            type="text"
            value={fileTitle}
            maxLength={120}
            disabled={!file}
            onChange={(event) => setFileTitle(event.target.value)}
            placeholder="Enter a title for this PDF"
            required
          />
          {!semesters.length && <p className="form-error">The admin has not created any semester folders yet.</p>}
          <label
            className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); pickFile(event.dataTransfer.files[0]); }}
          >
            <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => pickFile(event.target.files?.[0])} />
            <span className="drop-icon">{file ? <FiFileText /> : <FiUploadCloud />}</span>
            {file ? <><strong>{file.name}</strong><span>{formatSize(file.size)} · PDF ready to upload</span></> : <><strong>Drop your PDF here, or <span>browse</span></strong><span>PDF only · up to 3 MB</span></>}
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={busy || !file || !fileTitle.trim()}>{busy ? 'Uploading…' : 'Upload notes'} {busy ? <FiClock /> : <FiArrowRight />}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
