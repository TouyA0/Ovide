import { create } from 'zustand';
import { CheckCircle2, Info, Trash2, Download, AlertTriangle } from 'lucide-react';

/* ── Store global ─────────────────────────────────────────────── */
interface ToastItem { id: number; msg: string; icon?: string; }

interface ToastStore {
  items: ToastItem[];
  push: (msg: string, icon?: string) => void;
}

let seq = 0;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (msg, icon) => {
    const id = ++seq;
    const duration = icon === 'error' ? 4000 : 2600;
    set(s => ({ items: [...s.items, { id, msg, icon }] }));
    setTimeout(() => set(s => ({ items: s.items.filter(x => x.id !== id) })), duration);
  },
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
  const items = useToastStore(s => s.items);
  return (
    <div className="toast-wrap">
      {items.map(t => (
        <div className={`toast${t.icon === 'error' ? ' error' : ''}`} key={t.id}>
          <span className="t-ok">
            {ICONS[t.icon ?? 'check-circle-2'] ?? <CheckCircle2 size={17} />}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
