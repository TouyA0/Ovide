import { Router } from 'express';
import { db } from '../db/client';
import { imports, transactions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// GET /imports?accountId=xxx
router.get('/', (req, res) => {
  const { accountId } = req.query;
  if (!accountId) { res.status(400).json({ error: 'accountId requis' }); return; }
  const rows = db.select().from(imports).where(eq(imports.accountId, accountId as string)).all();
  res.json(rows);
});

// POST /imports — crée l'import + toutes les transactions liées
router.post('/', (req, res) => {
  const { accountId, filename, bankName, txs } = req.body as {
    accountId: string;
    filename: string;
    bankName: string;
    txs: { date: string; libelle: string; montant: number; type: 'income' | 'expense' }[];
  };
  if (!accountId || !filename || !bankName || !Array.isArray(txs)) {
    res.status(400).json({ error: 'accountId, filename, bankName et txs requis' });
    return;
  }

  const importId = 'imp_' + randomUUID().slice(0, 12);
  const importedAt = new Date().toISOString().slice(0, 10);

  db.insert(imports).values({
    id: importId,
    accountId,
    filename,
    bankName,
    importedAt,
    transactionCount: txs.length,
  }).run();

  for (const tx of txs) {
    const id = 'tx_' + randomUUID().slice(0, 12);
    db.insert(transactions).values({
      id,
      accountId,
      type: tx.type,
      montant: Math.abs(tx.montant),
      categorieId: null,
      libelle: tx.libelle,
      date: tx.date,
      note: '',
      transferId: null,
      dir: null,
      recurrenceId: null,
      importId,
    }).run();
  }

  res.status(201).json({ id: importId, transactionCount: txs.length });
});

// DELETE /imports/:id — supprime l'import + toutes ses transactions
router.delete('/:id', (req, res) => {
  const imp = db.select().from(imports).where(eq(imports.id, req.params.id)).get();
  if (!imp) { res.status(404).json({ error: 'Import introuvable' }); return; }

  db.delete(transactions).where(and(
    eq(transactions.accountId, imp.accountId),
    eq(transactions.importId, req.params.id),
  )).run();
  db.delete(imports).where(eq(imports.id, req.params.id)).run();

  res.json({ ok: true });
});

export default router;
