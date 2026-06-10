import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  title: string;
}

export function Modal({ children, onClose, wide, title }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
