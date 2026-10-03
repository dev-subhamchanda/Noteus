import type { ReactNode } from 'react';
import { FiPlus } from 'react-icons/fi';

export default function EmptyState({
  icon,
  title,
  detail,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{detail}</p>
      {onAction && <button className="primary-button" onClick={onAction}><FiPlus /> Upload a PDF</button>}
    </div>
  );
}
