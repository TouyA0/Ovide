import { useEffect } from 'react';

export interface Action { icon?: React.ReactNode; label?: string; fn?: () => void; danger?: boolean; sep?: boolean; }

interface Header {
  title: string;
  subtitle?: string;
  color: string;    // valeur CSS : 'var(--m-q)' ou oklch(…)
  initiales: string;
}

interface Props {
  ctx: { x: number; y: number };
  header: Header;
  actions: Action[];
  onClose: () => void;
}

export function ContextMenu({ ctx, header, actions, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const W = 224, H = 320;
  const left = Math.min(ctx.x, window.innerWidth - W - 8);
  const top  = Math.min(ctx.y, window.innerHeight - H - 8);

  return (
    <>
      <div className="ctx-overlay" onMouseDown={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
      <div className="ctx" style={{ left, top }} role="menu">
        <div className="ctx-head">
          <span className="avatar" style={{ background: header.color, width: 20, height: 20, fontSize: 9 }}>
            {header.initiales}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="nm">{header.title}</div>
            {header.subtitle && <div className="mb">{header.subtitle}</div>}
          </div>
        </div>
        {actions.map((a, i) => a.sep
          ? <div className="ctx-sep" key={i} />
          : <button key={i} className={`ctx-item${a.danger ? ' danger' : ''}`} onClick={() => { a.fn?.(); onClose(); }}>
              <span className="ci">{a.icon}</span>{a.label}
            </button>
        )}
      </div>
    </>
  );
}
