import { Router } from 'express';
import { db } from '../db/client';
import { transactions, accounts, members, categories } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/:accountId/csv', (req, res) => {
  const acc = db.select().from(accounts).where(eq(accounts.id, req.params.accountId)).get();
  if (!acc) { res.status(404).json({ error: 'Compte introuvable' }); return; }

  const member = db.select().from(members).where(eq(members.id, acc.memberId)).get();
  const cats = db.select().from(categories).all();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  const txs = db.select().from(transactions)
    .where(eq(transactions.accountId, req.params.accountId))
    .orderBy(transactions.date)
    .all();

  const rows: string[][] = [['Date', 'Type', 'Montant', 'Catégorie', 'Libellé', 'Note']];
  for (const t of txs) {
    const cat = t.categorieId ? catMap[t.categorieId] : null;
    const sign = t.type === 'income' ? '' : t.type === 'expense' ? '-' : (t.dir === 'in' ? '' : '-');
    rows.push([
      t.date,
      t.type,
      sign + t.montant.toFixed(2).replace('.', ','),
      cat ? cat.nom : (t.type === 'transfer' ? 'Virement' : ''),
      (t.libelle ?? '').replace(/"/g, '""'),
      (t.note ?? '').replace(/"/g, '""'),
    ]);
  }

  const csv = rows.map(r => r.map(v => /[;"\n,]/.test(v) ? `"${v}"` : v).join(';')).join('\n');
  const filename = `${member?.nom ?? 'export'}_${acc.nom}.csv`.replace(/\s+/g, '_');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv); // BOM pour Excel
});

export default router;
