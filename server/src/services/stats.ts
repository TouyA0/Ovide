import { db } from '../db/client';
import { transactions } from '../db/schema';
import { eq, sql, and, like } from 'drizzle-orm';

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

export function getBalanceSeries(accountId: string, soldeInitial: number, range: 'mois' | 'six' | 'annee', today: string) {
  const [TY, TM, TD] = today.split('-').map(Number);

  if (range === 'mois') {
    const series = [];
    for (let d = 1; d <= TD; d++) {
      const iso = `${TY}-${String(TM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      series.push({ label: String(d), value: balanceAt(accountId, soldeInitial, iso) });
    }
    return series;
  }

  const months = range === 'annee' ? 12 : 6;
  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    let y = TY, m = TM - 1 - i;
    while (m < 0) { m += 12; y -= 1; }
    const end = i === 0 ? today : endOfMonth(y, m + 1);
    const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    series.push({ label: MONTHS[m], value: balanceAt(accountId, soldeInitial, end) });
  }
  return series;
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
