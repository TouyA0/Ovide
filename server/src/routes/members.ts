import { Router } from 'express';
import { db } from '../db/client';
import { members, accounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { computeBalance } from '../services/balance';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.select().from(members).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nom, couleur, initiales } = req.body;
  if (!nom || !couleur || !initiales) {
    res.status(400).json({ error: 'nom, couleur et initiales requis' });
    return;
  }
  const id = 'm_' + randomUUID().slice(0, 8);
  db.insert(members).values({ id, nom, couleur, initiales }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { nom, couleur, initiales } = req.body;
  db.update(members).set({ nom, couleur, initiales }).where(eq(members.id, req.params.id)).run();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  // Ne supprime que si aucun compte actif
  const accs = db.select().from(accounts).where(eq(accounts.memberId, req.params.id)).all();
  if (accs.some(a => !a.archive)) {
    res.status(409).json({ error: 'Archivez d\'abord tous les comptes du membre' });
    return;
  }
  db.delete(members).where(eq(members.id, req.params.id)).run();
  res.json({ ok: true });
});

// Solde total d'un membre (somme de tous ses comptes)
router.get('/:id/balance', (req, res) => {
  const accs = db.select().from(accounts).where(eq(accounts.memberId, req.params.id)).all();
  const total = accs.reduce((s, a) => s + computeBalance(a.id), 0);
  res.json({ total });
});

export default router;
