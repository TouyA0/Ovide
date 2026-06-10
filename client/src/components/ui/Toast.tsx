import { useState, useCallback } from 'react';
import { CheckCircle2, Info, Trash2, Download } from 'lucide-react';

interface ToastItem { id: number; msg: string; icon?: string; }

const ICONS: Record<string, React.ReactNode> = {
  'check-circle-2': <CheckCircle2 size={17} />,
  'info': <Info size={17} />,
  'trash-2': <Trash2 size={17} />,
  'download': <Download size={17} />,
};

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="toast-wrap">
      {items.map(t => (
        <div className="toast" key={t.id}>
          <span className="t-ok">{ICONS[t.icon ?? 'check-circle-2'] ?? <CheckCircle2 size={17} />}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

let seq = 0;

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((msg: string, icon?: string) => {
    const id = ++seq;
    setItems(t => [...t, { id, msg, icon }]);
    setTimeout(() => setItems(t => t.filter(x => x.id !== id)), 2600);
  }, []);

  return { items, push };
}
