export const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const MONTHS_FULL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function fmtEur(n: number, opts: { sign?: boolean } = {}): string {
  const v = Math.abs(n);
  const s = v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? '−' : opts.sign ? '+' : '') + s + ' €';
}

export function fmtEurShort(n: number): string {
  const v = Math.abs(n);
  if (v >= 1000) return (n < 0 ? '−' : '') + (v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k€';
  return (n < 0 ? '−' : '') + Math.round(v) + ' €';
}

export function fmtDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_FULL[m - 1]} ${y}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function relDay(iso: string): string {
  const t = today();
  if (iso === t) return "Aujourd'hui";
  const diff = Math.round((new Date(t).getTime() - new Date(iso).getTime()) / 86400000);
  if (diff === 1) return 'Hier';
  const [y, m, d] = iso.split('-').map(Number);
  const currentYear = new Date().getFullYear();
  return `${d} ${MONTHS[m - 1]}${y !== currentYear ? ' ' + y : ''}`;
}

export function pctDelta(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function fmtChange(cur: number, prev: number): string {
  const d = pctDelta(cur, prev);
  if (!isFinite(d) || Math.abs(d) >= 200 || (cur < 0) !== (prev < 0)) {
    const diff = cur - prev;
    return (diff >= 0 ? '+' : '−') + fmtEurShort(Math.abs(diff));
  }
  return (d >= 0 ? '+' : '') + d.toFixed(0) + ' %';
}
