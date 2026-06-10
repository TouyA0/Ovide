import { create } from 'zustand';
import { CheckCircle2, Info, Trash2, Download, AlertTriangle } from 'lucide-react';

/* ── Store global ─────────────────────────────────────────────── */
interface ToastItem { id: number; msg: string; icon?: string; action?: { label: string; fn: () => void }; }

interface ToastStore {
  items: ToastItem[];
  push: (msg: string, icon?: string, action?: ToastItem['action']) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (msg, icon, action) => {
    const id = ++seq;
    const duration = icon === 'error' ? 4000 : action ? 5000 : 2600;
    set(s => ({ items: [...s.items, { id, msg, icon, action }] }));
    setTimeout(() => set(s => ({ items: s.items.filter(x => x.id !== id) })), duration);
  },
  dismiss: (id) => set(s => ({ items: s.items.filter(x => x.id !== id) })),
}));

/* ── Icônes ───────────────────────────────────────────────────── */
const ICONS: Record<string, React.ReactNode> = {
  'check-circle-2': <CheckCircle2 size={17} />,
  'info':           <Info size={17} />,
  'trash-2':        <Trash2 size={17} />,
  'download':       <Download size={17} />,
  'error':          <AlertTriangle size={17} />,
};

/* ── Composant ────────────────────────────────────────────────── */
export function Toasts() {
  const { items, dismiss } = useToastStore();
  return (
    <div className="toast-wrap">
      {items.map(t => (
        <div className={`toast${t.icon === 'error' ? ' error' : ''}`} key={t.id}>
          <span className="t-ok">
            {ICONS[t.icon ?? 'check-circle-2'] ?? <CheckCircle2 size={17} />}
          </span>
          {t.msg}
          {t.action && (
            <button className="toast-action" onClick={() => { t.action!.fn(); dismiss(t.id); }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
