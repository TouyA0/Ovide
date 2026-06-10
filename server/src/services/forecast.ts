import { db } from '../db/client';
import { recurrences, recurrenceSkips, accounts, transactions } from '../db/schema';
import { eq, and, like, sql } from 'drizzle-orm';

export interface ForecastItem {
  id: string;
  accountId: string;
  montant: number;
  sens: string;
  categorieId: string | null;
  libelle: string;
  jourDuMois: number;
  note: string;
  position: number;
  date: string;
  day: number;
}

/** Fenêtre de retard maximale en jours (pour les mois précédents) */
const MAX_OVERDUE_DAYS = 20;

export function buildForecast(accountId: string, today: string): ForecastItem[] {
  const acc = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!acc || !acc.previsionsActivees || acc.type !== 'courant') return [];

  const [TY, TM] = today.split('-').map(Number);
  const recs = db.select().from(recurrences).where(eq(recurrences.accountId, accountId)).all();
  if (recs.length === 0) return [];

  // Skips enregistrés — clé `recurrenceId|monthPrefix`
  const recIds = recs.map(r => r.id);
  const allSkips = new Set(
    db.select({ recurrenceId: recurrenceSkips.recurrenceId, monthPrefix: recurrenceSkips.monthPrefix })
      .from(recurrenceSkips)
      .all()
      .filter(s => recIds.includes(s.recurrenceId))
      .map(s => `${s.recurrenceId}|${s.monthPrefix}`),
  );

  // Limite de remontée : le plus loin entre (début du mois courant) et (aujourd'hui − 20 j)
  const cutoffTs = Date.parse(today) - MAX_OVERDUE_DAYS * 86400000;
  const cutoffFromDays = new Date(cutoffTs).toISOString().slice(0, 10);
  const cutoffFromMonth = `${TY}-${String(TM).padStart(2, '0')}-01`;
  const cutoff = cutoffFromDays < cutoffFromMonth ? cutoffFromDays : cutoffFromMonth;

  // Mois à parcourir (du mois de la cutoff au mois courant inclus)
  const [cutY, cutM] = cutoff.split('-').map(Number);
  const monthsToScan: { y: number; m: number }[] = [];
  let sy = cutY, sm = cutM;
  while (sy < TY || (sy === TY && sm <= TM)) {
    monthsToScan.push({ y: sy, m: sm });
    sm++; if (sm > 12) { sm = 1; sy++; }
  }

  const items: ForecastItem[] = [];

  // 1. Items en retard : date >= cutoff et date <= today
  for (const { y, m } of monthsToScan) {
    const lastDay = new Date(y, m, 0).getDate();
    const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;

    const confirmedIds = new Set(
      db.select({ recurrenceId: transactions.recurrenceId })
        .from(transactions)
        .where(and(
          eq(transactions.accountId, accountId),
          like(transactions.date, `${monthPrefix}%`),
          sql`recurrence_id IS NOT NULL`,
        ))
        .all()
        .map(r => r.recurrenceId as string),
    );

    for (const r of recs) {
      if (confirmedIds.has(r.id)) continue;
      if (allSkips.has(`${r.id}|${monthPrefix}`)) continue;
      const day = Math.min(r.jourDuMois, lastDay);
      const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (date < cutoff) continue;
      if (date > today) continue;
      if (date < r.createdAt) continue; // ne pas agir sur le passé avant la création
      items.push({ ...r, date, day });
    }
  }

  // 2. Items à venir : date > today (mois courant uniquement)
  {
    const lastDay = new Date(TY, TM, 0).getDate();
    const monthPrefix = `${TY}-${String(TM).padStart(2, '0')}`;
    const confirmedIds = new Set(
      db.select({ recurrenceId: transactions.recurrenceId })
        .from(transactions)
        .where(and(
          eq(transactions.accountId, accountId),
          like(transactions.date, `${monthPrefix}%`),
          sql`recurrence_id IS NOT NULL`,
        ))
        .all()
        .map(r => r.recurrenceId as string),
    );
    for (const r of recs) {
      if (confirmedIds.has(r.id)) continue;
      if (allSkips.has(`${r.id}|${monthPrefix}`)) continue;
      const day = Math.min(r.jourDuMois, lastDay);
      const date = `${TY}-${String(TM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (date <= today) continue;
      if (date < r.createdAt) continue;
      items.push({ ...r, date, day });
    }
  }

  // Tri chronologique ascendant pour les deux sections (passé→présent, puis futur proche→loin)
  items.sort((a, b) => {
    const aOver = a.date <= today;
    const bOver = b.date <= today;
    if (aOver && !bOver) return -1; // overdue avant upcoming
    if (!aOver && bOver) return 1;
    return a.date.localeCompare(b.date); // ascending dans chaque section
  });

  return items;
}
