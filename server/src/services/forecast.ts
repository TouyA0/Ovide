import { db } from '../db/client';
import { recurrences, accounts } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ForecastItem {
  id: string;
  accountId: string;
  montant: number;
  sens: string;
  categorieId: string | null;
  libelle: string;
  jourDuMois: number;
  date: string;
}

export function buildForecast(accountId: string, today: string): ForecastItem[] {
  const acc = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!acc || !acc.previsionsActivees || acc.type !== 'courant') return [];

  const [TY, TM, TD] = today.split('-').map(Number);
  const lastDay = new Date(TY, TM, 0).getDate();

  const recs = db.select().from(recurrences).where(eq(recurrences.accountId, accountId)).all();

  return recs
    .map((r) => {
      const day = Math.min(r.jourDuMois, lastDay);
      const date = `${TY}-${String(TM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { ...r, date, day };
    })
    .filter((r) => r.day >= TD)
    .sort((a, b) => a.day - b.day);
}
