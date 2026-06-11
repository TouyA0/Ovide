import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS_FULL } from '../../utils/format';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const POP_HEIGHT = 320;
const POP_WIDTH = 264;

function pad(n: number) { return String(n).padStart(2, '0'); }
function toIso(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

interface Props {
  value: string;
  onChange: (iso: string) => void;
  ariaLabel?: string;
}

export function DatePicker({ value, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const selected = value ? fromIso(value) : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const sel = value ? fromIso(value) : new Date();
    setViewYear(sel.getFullYear());
    setViewMonth(sel.getMonth());
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUp = window.innerHeight - rect.bottom < POP_HEIGHT && rect.top > POP_HEIGHT;
    const top = openUp ? rect.top - POP_HEIGHT - 6 : rect.bottom + 6;
    const left = Math.min(rect.left, window.innerWidth - POP_WIDTH - 8);
    setPos({ top, left: Math.max(8, left) });
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const todayIso = toIso(new Date());
  const valueIso = value || '';

  const goPrev = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const goNext = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  const display = value ? `${selected.getDate()} ${MONTHS_FULL[selected.getMonth()]} ${selected.getFullYear()}` : '';

  return (
    <div className="datepicker">
      <button ref={triggerRef} type="button" className="input datepicker-trigger" aria-label={ariaLabel} onClick={() => setOpen(o => !o)}>
        <Calendar size={15} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
        <span>{display}</span>
      </button>
      {open && createPortal(
        <div className="datepicker-pop" ref={popRef} style={{ top: pos.top, left: pos.left }}>
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={goPrev}><ChevronLeft size={16} /></button>
            <span className="dp-month">{MONTHS_FULL[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav" onClick={goNext}><ChevronRight size={16} /></button>
          </div>
          <div className="dp-grid dp-weekdays">
            {WEEKDAYS.map((w, i) => <span key={i} className="dp-weekday">{w}</span>)}
          </div>
          <div className="dp-grid">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const iso = toIso(d);
              return (
                <button type="button" key={i}
                  className={`dp-day${iso === valueIso ? ' on' : ''}${iso === todayIso ? ' today' : ''}`}
                  onClick={() => { onChange(iso); setOpen(false); }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <button type="button" className="dp-today-btn" onClick={() => { onChange(todayIso); setOpen(false); }}>Aujourd'hui</button>
        </div>,
        document.body
      )}
    </div>
  );
}
