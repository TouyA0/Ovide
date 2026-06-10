import { Router } from 'express';
import { db } from '../db/client';
import { accounts, members, transactions, recurrences, recurrenceSkips, imports } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { computeBalance } from '../services/balance';
import { uploadsDir } from '../index';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.select().from(accounts).all();
  const withBalance = rows.map(a => ({ ...a, balance: computeBalance(a.id) }));
  res.json(withBalance);
});

router.get('/:id', (req, res) => {
  const a = db.select().from(accounts).where(eq(accounts.id, req.params.id)).get();
  if (!a) { res.status(404).json({ error: 'Compte introuvable' }); return; }
  res.json({ ...a, balance: computeBalance(a.id) });
});

router.post('/', (req, res) => {
  const { memberId, nom, type, banque, soldeInitial } = req.body;
  if (!memberId || !nom) { res.status(400).json({ error: 'memberId et nom requis' }); return; }

  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  if (!member) { res.status(404).json({ error: 'Membre introuvable' }); return; }

  const id = 'a_' + randomUUID().slice(0, 8);
  db.insert(accounts).values({
    id, memberId, nom,
    type: type ?? 'courant',
    banque: banque ?? null,
    soldeInitial: soldeInitial ?? 0,
    previsionsActivees: type === 'courant',
    archive: false,
  }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { nom, type, banque, soldeInitial, previsionsActivees } = req.body;
  db.update(accounts).set({ nom, type, banque: banque ?? null, soldeInitial, previsionsActivees }).where(eq(accounts.id, req.params.id)).run();
  res.json({ ok: true });
});

router.patch('/:id/previsions', (req, res) => {
  const a = db.select().from(accounts).where(eq(accounts.id, req.params.id)).get();
  if (!a) { res.status(404).json({ error: 'Compte introuvable' }); return; }
  db.update(accounts).set({ previsionsActivees: !a.previsionsActivees }).where(eq(accounts.id, req.params.id)).run();
  res.json({ previsionsActivees: !a.previsionsActivees });
});

router.patch('/:id/archive', (req, res) => {
  const { archive } = req.body;
  db.update(accounts).set({ archive: !!archive }).where(eq(accounts.id, req.params.id)).run();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const acc = db.select().from(accounts).where(eq(accounts.id, req.params.id)).get();
  if (!acc) { res.status(404).json({ error: 'Compte introuvable' }); return; }
  if (!acc.archive) { res.status(400).json({ error: 'Le compte doit être archivé avant suppression' }); return; }

  db.transaction(tx => {
    // Supprimer les fichiers reçus liés aux transactions
    const txRows = db.select({ receiptPath: transactions.receiptPath }).from(transactions).where(eq(transactions.accountId, acc.id)).all();
    for (const t of txRows) {
      if (t.receiptPath) {
        const filePath = path.join(uploadsDir, path.basename(t.receiptPath));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    tx.delete(transactions).where(eq(transactions.accountId, acc.id)).run();
    const recs = db.select({ id: recurrences.id }).from(recurrences).where(eq(recurrences.accountId, acc.id)).all();
    for (const r of recs) {
      tx.delete(recurrenceSkips).where(eq(recurrenceSkips.recurrenceId, r.id)).run();
    }
    tx.delete(recurrences).where(eq(recurrences.accountId, acc.id)).run();
    tx.delete(imports).where(eq(imports.accountId, acc.id)).run();
    tx.delete(accounts).where(eq(accounts.id, acc.id)).run();
  });

  res.json({ ok: true });
});

export default router;
