import { Router } from 'express';
import { db } from '../db/client';
import { categories } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.select().from(categories).orderBy(asc(categories.position)).all());
});

// PATCH /categories/reorder — body: { ids: string[] } (ordre souhaité)
router.patch('/reorder', (req, res) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids requis' }); return; }
  ids.forEach((id, i) => {
    db.update(categories).set({ position: i }).where(eq(categories.id, id)).run();
  });
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const { nom, icone, hue, type } = req.body;
  if (!nom || !icone) { res.status(400).json({ error: 'nom et icone requis' }); return; }
  const id = 'cat_' + randomUUID().slice(0, 8);
  const maxPos = db.select().from(categories).orderBy(asc(categories.position)).all().length;
  db.insert(categories).values({ id, nom, icone, hue: hue ?? 60, type: type ?? 'expense', position: maxPos }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { nom, icone, hue, type } = req.body;
  db.update(categories).set({ nom, icone, hue, type }).where(eq(categories.id, req.params.id)).run();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.delete(categories).where(eq(categories.id, req.params.id)).run();
  res.json({ ok: true });
});

export default router;
