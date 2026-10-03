import { useState } from 'react';
import { FiDownload, FiEye, FiFileText, FiX } from 'react-icons/fi';
import { toast } from 'sonner';
import PdfExpressViewer from './PdfExpressViewer';
import { getNoteAccessUrl } from '../services/notes.service';
import type { UploadRecord } from '../types/app';
import { formatSize } from '../utils/format';

export default function UploadList({ uploads, token }: { uploads: UploadRecord[]; token: string }) {
  const [preview, setPreview] = useState<{ upload: UploadRecord; url: string } | null>(null);
  const [openingFileId, setOpeningFileId] = useState('');

  const openPreview = async (upload: UploadRecord) => {
    setOpeningFileId(upload.id);
    try {
      const url = await getNoteAccessUrl(upload.publicId, 'view', token);
      setPreview({ upload, url });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to open the PDF.');
    } finally {
      setOpeningFileId('');
    }
  };

  const download = async (upload: UploadRecord) => {
    setOpeningFileId(upload.id);
    try {
      const url = await getNoteAccessUrl(upload.publicId, 'download', token);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to download the PDF (HTTP ${response.status}).`);
      }

      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = upload.name;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
      toast.success('Download started.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to download the PDF.');
    } finally {
      setOpeningFileId('');
    }
  };

  return (
    <>
      <div className="uploads-table-wrap">
        <div className="uploads-table-head"><span>FILE NAME</span><span>SUBJECT</span><span>FILE SIZE</span><span>UPLOADED</span><span>ACTIONS</span></div>
        {uploads.map((upload) => (
          <div className="uploads-table-row" key={upload.id}>
            <div className="uploaded-file">
              <span className="pdf-icon"><FiFileText /></span>
              <div className="min-w-0"><button className="uploaded-file-name" type="button" onClick={() => void openPreview(upload)} title={`Preview ${upload.name}`}>{upload.name}</button><small>PDF document</small></div>
            </div>
            <span className="file-subject">{upload.subject}{upload.semesterName && <small>{upload.semesterName}</small>}</span>
            <span className="file-size">{formatSize(upload.size)}</span>
            <span className="file-date">{new Date(upload.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="file-actions">
              <button type="button" onClick={() => void openPreview(upload)} disabled={openingFileId === upload.id} aria-label={`View ${upload.name}`} title="View PDF"><FiEye /></button>
              <button type="button" onClick={() => void download(upload)} disabled={openingFileId === upload.id} aria-label={`Download ${upload.name}`} title="Download PDF"><FiDownload /></button>
            </span>
          </div>
        ))}
      </div>
      {preview && (
        <div className="pdf-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <section className="pdf-preview-dialog" role="dialog" aria-modal="true" aria-label={`PDF preview: ${preview.upload.name}`}>
            <header className="pdf-preview-header">
              <div className="min-w-0"><strong title={preview.upload.name}>{preview.upload.name}</strong><small>{preview.upload.semesterName ? `${preview.upload.semesterName} · ` : ''}{preview.upload.subject}</small></div>
              <div className="pdf-preview-actions">
                <button className="pdf-preview-download" type="button" onClick={() => void download(preview.upload)}><FiDownload /> Download</button>
                <button className="icon-button" type="button" aria-label="Close PDF preview" onClick={() => setPreview(null)}><FiX /></button>
              </div>
            </header>
            <PdfExpressViewer key={preview.upload.id} sourceUrl={preview.url} />
            <p className="pdf-preview-note">PDF viewer powered by PDF.js Express. Downloads use a short-lived secure link.</p>
          </section>
        </div>
      )}
    </>
  );
}
