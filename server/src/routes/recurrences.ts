import { Router } from 'express';
import { db } from '../db/client';
import { recurrences } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  const { accountId } = req.query;
  if (accountId) {
    res.json(db.select().from(recurrences).where(eq(recurrences.accountId, accountId as string)).all());
    return;
  }
  res.json(db.select().from(recurrences).all());
});

router.post('/', (req, res) => {
  const { accountId, montant, sens, categorieId, jourDuMois, libelle } = req.body;
  if (!accountId || !montant || !sens || !jourDuMois) {
    res.status(400).json({ error: 'accountId, montant, sens et jourDuMois requis' });
    return;
  }
  const id = 'rec_' + randomUUID().slice(0, 8);
  db.insert(recurrences).values({ id, accountId, montant: Number(montant), sens, categorieId: categorieId ?? null, jourDuMois: Number(jourDuMois), libelle: libelle ?? '' }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { montant, sens, categorieId, jourDuMois, libelle } = req.body;
  db.update(recurrences).set({ montant, sens, categorieId, jourDuMois, libelle }).where(eq(recurrences.id, req.params.id)).run();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.delete(recurrences).where(eq(recurrences.id, req.params.id)).run();
  res.json({ ok: true });
});

export default router;
