import type { ReactNode } from 'react';

export default function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
