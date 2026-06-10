import { useState } from 'react';
import { fmtEurShort } from '../../utils/format';
import type { BarPoint } from '../../api/client';

export function IncomeExpenseBars({ data }: { data: BarPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
  const H = 180;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(6px,2cqw,18px)', height: H, padding: '4px 2px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center', position: 'relative' }}>
              {hover === i && (
                <div style={{ position: 'absolute', bottom: '100%', marginBottom: 8, background: 'var(--text)', color: 'var(--bg)', padding: '7px 10px', borderRadius: 9, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 5, boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ color: 'var(--pos)' }}>+{fmtEurShort(d.income)}</div>
                  <div style={{ color: 'var(--neg)' }}>−{fmtEurShort(d.expense)}</div>
                </div>
              )}
              <div title="Entrées" style={{ width: '42%', maxWidth: 22, height: `${(d.income / max) * 100}%`, background: 'var(--pos)', borderRadius: '5px 5px 0 0', minHeight: 2, opacity: hover === null || hover === i ? 1 : .4, transition: 'opacity .12s, height .3s cubic-bezier(.16,1,.3,1)' }} />
              <div title="Dépenses" style={{ width: '42%', maxWidth: 22, height: `${(d.expense / max) * 100}%`, background: 'var(--neg)', borderRadius: '5px 5px 0 0', minHeight: 2, opacity: hover === null || hover === i ? 1 : .4, transition: 'opacity .12s, height .3s cubic-bezier(.16,1,.3,1)' }} />
            </div>
            <div style={{ fontSize: 11, color: hover === i ? 'var(--text)' : 'var(--text-3)', fontWeight: 600 }}>{d.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, fontWeight: 600 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--pos)', display: 'block' }} /> Entrées</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--neg)', display: 'block' }} /> Dépenses</span>
      </div>
    </div>
  );
}
