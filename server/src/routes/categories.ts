import { Router } from 'express';
import { db } from '../db/client';
import { categories } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.select().from(categories).all());
});

router.post('/', (req, res) => {
  const { nom, icone, hue } = req.body;
  if (!nom || !icone) { res.status(400).json({ error: 'nom et icone requis' }); return; }
  const id = 'cat_' + randomUUID().slice(0, 8);
  db.insert(categories).values({ id, nom, icone, hue: hue ?? 60 }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { nom, icone, hue } = req.body;
  db.update(categories).set({ nom, icone, hue }).where(eq(categories.id, req.params.id)).run();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.delete(categories).where(eq(categories.id, req.params.id)).run();
  res.json({ ok: true });
});

export default router;
