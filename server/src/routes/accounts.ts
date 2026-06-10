import { Router } from 'express';
import { db } from '../db/client';
import { accounts, members } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { computeBalance } from '../services/balance';

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
  const { memberId, nom, type, soldeInitial } = req.body;
  if (!memberId || !nom) { res.status(400).json({ error: 'memberId et nom requis' }); return; }

  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  if (!member) { res.status(404).json({ error: 'Membre introuvable' }); return; }

  const id = 'a_' + randomUUID().slice(0, 8);
  db.insert(accounts).values({
    id, memberId, nom,
    type: type ?? 'courant',
    soldeInitial: soldeInitial ?? 0,
    previsionsActivees: type === 'courant',
    archive: false,
  }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { nom, type, soldeInitial, previsionsActivees } = req.body;
  db.update(accounts).set({ nom, type, soldeInitial, previsionsActivees }).where(eq(accounts.id, req.params.id)).run();
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

export default router;
