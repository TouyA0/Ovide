import { db } from '../db/client';
import { transactions, recurrences } from '../db/schema';
import { eq, sql, and, like } from 'drizzle-orm';

export interface BalancePoint { label: string; value: number; }
export interface BalanceSeries { series: BalancePoint[]; projection: BalancePoint[]; }

function monthPrefix(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`;
}

function endOfMonth(y: number, m: number) {
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Solde à la fin d'une date donnée (sur les transactions <= endISO)
function balanceAt(accountId: string, soldeInitial: number, endISO: string): number {
  const result = db
    .select({
      signed: sql<number>`
        SUM(
          CASE
            WHEN type = 'income'  THEN montant
            WHEN type = 'expense' THEN -montant
            WHEN type = 'transfer' AND dir = 'in'  THEN  montant
            WHEN type = 'transfer' AND dir = 'out' THEN -montant
            ELSE 0
          END
        )
      `.as('signed'),
    })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), sql`date <= ${endISO}`))
    .get();
  return soldeInitial + (result?.signed ?? 0);
}

// Agrégat entrées/dépenses pour un mois donné (hors virements)
function monthAgg(accountId: string, prefix: string) {
  const rows = db
    .select({
      type: transactions.type,
      total: sql<number>`SUM(montant)`.as('total'),
    })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), like(transactions.date, `${prefix}%`), sql`type IN ('income','expense')`))
    .groupBy(transactions.type)
    .all();

  let income = 0, expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income = r.total ?? 0;
    if (r.type === 'expense') expense = r.total ?? 0;
  }
  return { income, expense, net: income - expense };
}

// Recurrences signed monthly net + per-day items for a given account
function recurrenceItems(accountId: string) {
  const recs = db.select().from(recurrences).where(eq(recurrences.accountId, accountId)).all();
  const items = recs.map(r => ({
    jourDuMois: r.jourDuMois,
    signed: r.sens === 'income' ? r.montant : -r.montant,
  }));
  const net = items.reduce((s, r) => s + r.signed, 0);
  return { net, items };
}

export function getBalanceSeries(
  accountId: string,
  soldeInitial: number,
  range: 'mois' | 'six' | 'annee',
  today: string,
  previsionsActivees: boolean,
): BalanceSeries {
  const [TY, TM, TD] = today.split('-').map(Number);
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const lastDay = new Date(TY, TM, 0).getDate();

  if (range === 'mois') {
    const series: BalancePoint[] = [];
    for (let d = 1; d <= TD; d++) {
      const iso = `${TY}-${String(TM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      series.push({ label: String(d), value: balanceAt(accountId, soldeInitial, iso) });
    }

    const projection: BalancePoint[] = [];
    if (previsionsActivees && TD < lastDay) {
      const { items } = recurrenceItems(accountId);
      let running = balanceAt(accountId, soldeInitial, today);
      for (let d = TD + 1; d <= lastDay; d++) {
        for (const item of items) {
          if (Math.min(item.jourDuMois, lastDay) === d) running += item.signed;
        }
        projection.push({ label: String(d), value: running });
      }
    }
    return { series, projection };
  }

  // "six" or "annee"
  const months = range === 'annee' ? 12 : 6;
  const series: BalancePoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    let y = TY, m = TM - 1 - i;
    while (m < 0) { m += 12; y -= 1; }
    const end = i === 0 ? today : endOfMonth(y, m + 1);
    series.push({ label: MONTHS[m], value: balanceAt(accountId, soldeInitial, end) });
  }

  const projection: BalancePoint[] = [];
  if (previsionsActivees) {
    const { net } = recurrenceItems(accountId);

    // Anchor all projections on the last confirmed month-end so that ALL
    // recurring items (including ones before today in the current month)
    // are taken into account uniformly — no partial-month filtering.
    let prevY = TY, prevM = TM - 1;
    if (prevM < 1) { prevM = 12; prevY -= 1; }
    const baseBalance = balanceAt(accountId, soldeInitial, endOfMonth(prevY, prevM));

    // Project only future months (skip current month to avoid duplicate label on X-axis)
    // base + 2×net = end of next month, base + 3×net = end of month after, etc.
    const futureMths = range === 'annee' ? 2 : 1;
    for (let i = 1; i <= futureMths; i++) {
      const m = (TM - 1 + i) % 12;
      projection.push({ label: MONTHS[m], value: baseBalance + net * (i + 1) });
    }
  }
  return { series, projection };
}

export function getMonthBars(accountId: string, months: number, today: string) {
  const [TY, TM] = today.split('-').map(Number);
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    let y = TY, m = TM - 1 - i;
    while (m < 0) { m += 12; y -= 1; }
    const { income, expense } = monthAgg(accountId, monthPrefix(y, m + 1));
    out.push({ label: MONTHS[m], income, expense });
  }
  return out;
}

export function getComparison(accountId: string, today: string) {
  const [TY, TM] = today.split('-').map(Number);
  const cur = monthPrefix(TY, TM);
  let py = TY, pm = TM - 1;
  if (pm < 1) { pm = 12; py -= 1; }
  const prev = monthPrefix(py, pm);
  return { cur: monthAgg(accountId, cur), prev: monthAgg(accountId, prev) };
}

export function getCategoryDonut(accountId: string, today: string) {
  const [TY, TM] = today.split('-').map(Number);
  const prefix = monthPrefix(TY, TM);

  return db
    .select({
      categorieId: transactions.categorieId,
      total: sql<number>`SUM(montant)`.as('total'),
    })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), like(transactions.date, `${prefix}%`), eq(transactions.type, 'expense')))
    .groupBy(transactions.categorieId)
    .orderBy(sql`total DESC`)
    .limit(7)
    .all();
}
