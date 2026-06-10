import { Router } from 'express';
import { db } from '../db/client';
import { recurrences, recurrenceSkips } from '../db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  const { accountId } = req.query;
  if (accountId) {
    res.json(db.select().from(recurrences).where(eq(recurrences.accountId, accountId as string)).orderBy(asc(recurrences.position)).all());
    return;
  }
  res.json(db.select().from(recurrences).orderBy(asc(recurrences.position)).all());
});

// PATCH /recurrences/reorder — body: { ids: string[] } (ordre souhaité)
router.patch('/reorder', (req, res) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids requis' }); return; }
  ids.forEach((id, i) => {
    db.update(recurrences).set({ position: i }).where(eq(recurrences.id, id)).run();
  });
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const { accountId, montant, sens, categorieId, jourDuMois, libelle, note } = req.body;
  if (!accountId || !montant || !sens || !jourDuMois) {
    res.status(400).json({ error: 'accountId, montant, sens et jourDuMois requis' });
    return;
  }
  const id = 'rec_' + randomUUID().slice(0, 8);
  const createdAt = new Date().toISOString().slice(0, 10);
  db.insert(recurrences).values({ id, accountId, montant: Number(montant), sens, categorieId: categorieId ?? null, jourDuMois: Number(jourDuMois), libelle: libelle ?? '', note: note ?? '', createdAt }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { montant, sens, categorieId, jourDuMois, libelle, note } = req.body;
  db.update(recurrences).set({ montant, sens, categorieId, jourDuMois, libelle, note: note ?? '' }).where(eq(recurrences.id, req.params.id)).run();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.delete(recurrenceSkips).where(eq(recurrenceSkips.recurrenceId, req.params.id)).run();
  db.delete(recurrences).where(eq(recurrences.id, req.params.id)).run();
  res.json({ ok: true });
});

// POST /:id/skip — ignorer cette récurrence pour un mois donné
router.post('/:id/skip', (req, res) => {
  const { monthPrefix } = req.body as { monthPrefix: string };
  if (!monthPrefix || !/^\d{4}-\d{2}$/.test(monthPrefix)) {
    res.status(400).json({ error: 'monthPrefix requis (YYYY-MM)' });
    return;
  }
  // Idempotent : on ne duplique pas si le skip existe déjà
  const exists = db.select().from(recurrenceSkips)
    .where(and(eq(recurrenceSkips.recurrenceId, req.params.id), eq(recurrenceSkips.monthPrefix, monthPrefix)))
    .get();
  if (!exists) {
    db.insert(recurrenceSkips).values({ id: 'sk_' + randomUUID().slice(0, 8), recurrenceId: req.params.id, monthPrefix }).run();
  }
  res.json({ ok: true });
});

// DELETE /:id/skip?monthPrefix=YYYY-MM — annuler un skip
router.delete('/:id/skip', (req, res) => {
  const monthPrefix = req.query.monthPrefix as string;
  if (!monthPrefix) { res.status(400).json({ error: 'monthPrefix requis' }); return; }
  db.delete(recurrenceSkips)
    .where(and(eq(recurrenceSkips.recurrenceId, req.params.id), eq(recurrenceSkips.monthPrefix, monthPrefix)))
    .run();
  res.json({ ok: true });
});

export default router;
