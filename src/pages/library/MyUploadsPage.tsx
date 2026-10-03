import { FiPlus, FiUploadCloud } from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import UploadList from '../../components/UploadList';
import type { UploadRecord } from '../../types/app';

export function UploadsPage({ uploads, token, onUpload }: { uploads: UploadRecord[]; token: string; onUpload: () => void }) {
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR UPLOADED FILES</p>
          <h1>My uploads</h1>
          <p className="page-subtitle">Every note you’ve added to your study space.</p>
        </div>
        <button className="primary-button heading-button" onClick={onUpload}><FiPlus /> New upload</button>
      </div>

      {uploads.length ? <UploadList uploads={uploads} token={token} /> : <EmptyState icon={<FiUploadCloud />} title="Your uploads will live here" detail="Add your first set of notes and keep all your study materials close by." onAction={onUpload} />}
    </div>
  );
}
