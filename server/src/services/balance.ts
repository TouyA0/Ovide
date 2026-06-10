import { db } from '../db/client';
import { transactions, accounts } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export function computeBalance(accountId: string): number {
  const acc = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!acc) return 0;

  // Somme signée : income = +, expense = -, transfer = ±dir
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
    .where(eq(transactions.accountId, accountId))
    .get();

  return acc.soldeInitial + (result?.signed ?? 0);
}

export function computeAllBalances(accountIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of accountIds) out[id] = computeBalance(id);
  return out;
}
