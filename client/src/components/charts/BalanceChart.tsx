import { useState, useId } from 'react';
import { fmtEur, fmtEurShort } from '../../utils/format';
import type { BalancePoint } from '../../api/client';

interface Props {
  series: BalancePoint[];
  projection?: BalancePoint[];
  accentVar?: string;
}

export function BalanceChart({ series, projection = [], accentVar = '--accent' }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, '');
  const W = 720, H = 240, padL = 8, padR = 8, padT = 16, padB = 26;
  const all = [...series, ...projection];
  if (all.length === 0) return null;

  const vals = all.map(d => d.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  min -= span * 0.12; max += span * 0.12;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x = (i: number) => padL + (all.length === 1 ? innerW / 2 : (i / (all.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const realPts = series.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const splitIdx = series.length - 1;
  const projPts = projection.map((d, i) => [x(splitIdx + 1 + i), y(d.value)] as [number, number]);
  const fullProj = projection.length ? [realPts[realPts.length - 1], ...projPts] : [];

  const line = (pts: [number, number][]) =>
    pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = realPts.length
    ? line(realPts) + ` L${realPts[realPts.length - 1][0]} ${padT + innerH} L${realPts[0][0]} ${padT + innerH} Z`
    : '';

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bestD = Infinity;
    all.forEach((_, i) => { const dd = Math.abs(x(i) - px); if (dd < bestD) { bestD = dd; best = i; } });
    setHover(best);
  };

  const ticks = 4;
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => min + (i / ticks) * (max - min));

  // Gestion du passage dans le négatif
  const realVals = vals.slice(0, series.length);
  const hasNeg = Math.min(...realVals) < 0;
  const hasMixed = hasNeg && Math.max(...realVals) > 0;
  const allNeg = hasNeg && Math.max(...realVals) <= 0;
  const zeroY = hasMixed ? y(0) : null;

  // Couleur de la courbe selon état
  const lineColor = allNeg ? 'var(--neg)' : `var(${accentVar})`;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {/* Dégradé zone positive */}
          <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={allNeg ? 'var(--neg)' : `var(${accentVar})`} stopOpacity={allNeg ? '0.12' : '0.20'} />
            <stop offset="100%" stopColor={allNeg ? 'var(--neg)' : `var(${accentVar})`} stopOpacity="0" />
          </linearGradient>
          {/* Dégradé zone négative */}
          {(hasMixed || allNeg) && (
            <linearGradient id={`${uid}bgNeg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neg)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--neg)" stopOpacity="0.16" />
            </linearGradient>
          )}
          {/* ClipPaths pour le split au niveau du zéro */}
          {zeroY !== null && (
            <>
              <clipPath id={`${uid}pos`}>
                <rect x="0" y="0" width={W} height={zeroY} />
              </clipPath>
              <clipPath id={`${uid}neg`}>
                <rect x="0" y={zeroY} width={W} height={H - zeroY} />
              </clipPath>
            </>
          )}
        </defs>

        {/* Grille horizontale */}
        {gridY.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL} y={y(g) - 4} fontSize="10.5" fill="var(--text-3)" fontWeight="600">{fmtEurShort(g)}</text>
          </g>
        ))}

        {/* Ligne zéro — marquée distinctement quand le solde passe en négatif */}
        {(zeroY !== null || allNeg) && (
          <g>
            <line
              x1={padL} x2={W - padR}
              y1={zeroY ?? y(0)} y2={zeroY ?? y(0)}
              stroke="var(--neg)" strokeWidth="1.5"
              strokeDasharray="4 3" opacity="0.55"
            />
            <text
              x={W - padR} y={(zeroY ?? y(0)) - 4}
              fontSize="10" fill="var(--neg)" textAnchor="end" fontWeight="700" opacity="0.65"
            >0 €</text>
          </g>
        )}

        {/* Aire remplie */}
        {area && (
          zeroY !== null ? (
            <>
              <path d={area} fill={`url(#${uid}bg)`} clipPath={`url(#${uid}pos)`} />
              <path d={area} fill={`url(#${uid}bgNeg)`} clipPath={`url(#${uid}neg)`} />
            </>
          ) : (
            <path d={area} fill={`url(#${uid}bg)`} />
          )
        )}

        {/* Courbe principale */}
        {realPts.length > 0 && (
          zeroY !== null ? (
            <>
              <path d={line(realPts)} fill="none" stroke={`var(${accentVar})`} strokeWidth="2.4"
                strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${uid}pos)`} />
              <path d={line(realPts)} fill="none" stroke="var(--neg)" strokeWidth="2.4"
                strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${uid}neg)`} />
            </>
          ) : (
            <path d={line(realPts)} fill="none" stroke={lineColor} strokeWidth="2.4"
              strokeLinejoin="round" strokeLinecap="round" />
          )
        )}

        {/* Courbe projection */}
        {fullProj.length > 0 && (
          <path d={line(fullProj)} fill="none" stroke={`var(${accentVar})`} strokeWidth="2.2"
            strokeDasharray="2 5" strokeLinecap="round" opacity="0.7" />
        )}

        {/* Labels dates */}
        {all.map((d, i) => (d.label && (all.length <= 14 || i % 2 === 0)) ? (
          <text key={i} x={x(i)} y={H - 6} fontSize="10.5" fill="var(--text-3)" textAnchor="middle" fontWeight="600">{d.label}</text>
        ) : null)}

        {/* Crosshair + point hover */}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--line-strong)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(all[hover].value)} r="5" fill="var(--surface)"
              stroke={all[hover].value < 0 ? 'var(--neg)' : `var(${accentVar})`} strokeWidth="2.4" />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hover != null && (
        <div style={{
          position: 'absolute', top: -6,
          left: `${(x(hover) / W) * 100}%`,
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none', background: 'var(--text)', color: 'var(--bg)',
          padding: '7px 10px', borderRadius: 9, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ opacity: .7, fontWeight: 600, fontSize: 10.5 }}>
            {all[hover].label}{hover > splitIdx ? ' · projeté' : ''}
          </div>
          <div className="tnum" style={{ color: all[hover].value < 0 ? 'var(--neg-soft)' : undefined }}>
            {fmtEur(all[hover].value)}
          </div>
        </div>
      )}
    </div>
  );
}
