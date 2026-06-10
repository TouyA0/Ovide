import { useState } from 'react';
import { fmtEurShort } from '../../utils/format';

interface Slice { nom: string; hue: number; value: number; }

export function CategoryDonut({ slices }: { slices: Slice[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 80, r = 50, C = 100;
  let acc = 0;

  const segs = slices.map((s) => {
    const frac = s.value / total;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (ang: number, rad: number): [number, number] => [C + rad * Math.cos(ang), C + rad * Math.sin(ang)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R);
    const [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    const d = `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    return { ...s, d, frac };
  });

  const active = hover != null ? segs[hover] : null;

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 200 200" width="160" height="160" style={{ flex: '0 0 auto' }}>
        {segs.map((s, i) => (
          <path key={i} d={s.d} fill={`oklch(0.6 0.12 ${s.hue})`}
            opacity={hover === null || hover === i ? 1 : .35}
            stroke="var(--surface)" strokeWidth="2"
            style={{ transition: 'opacity .12s', cursor: 'default' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
        <text x="100" y="94" textAnchor="middle" fontSize="13" fill="var(--text-3)" fontWeight="600">
          {active ? active.nom : 'Total'}
        </text>
        <text x="100" y="116" textAnchor="middle" fontSize="20" fill="var(--text)" fontWeight="800">
          {active ? fmtEurShort(active.value) : fmtEurShort(total)}
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, opacity: hover === null || hover === i ? 1 : .45, transition: 'opacity .12s' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.6 0.12 ${s.hue})`, flex: '0 0 auto', display: 'block' }} />
            <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nom}</span>
            <span className="muted tnum" style={{ fontWeight: 600 }}>{Math.round(s.frac * 100)}%</span>
            <span className="tnum" style={{ fontWeight: 700, minWidth: 56, textAlign: 'right' }}>{fmtEurShort(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
