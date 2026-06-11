import { Router } from 'express';
import { db } from '../db/client';
import { members, accounts, transactions, recurrences, recurrenceSkips, imports } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { computeBalance } from '../services/balance';
import { avatarsDir } from '../index';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `avatar_${req.params.id}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//i.test(file.mimetype));
  },
});

router.get('/', (_req, res) => {
  const rows = db.select().from(members).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nom, couleur, initiales, avatarIcon } = req.body;
  if (!nom || !couleur || !initiales) {
    res.status(400).json({ error: 'nom, couleur et initiales requis' });
    return;
  }
  const id = 'm_' + randomUUID().slice(0, 8);
  db.insert(members).values({ id, nom, couleur, initiales, avatarIcon: avatarIcon ?? null }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { nom, couleur, initiales, avatarIcon } = req.body;
  const set: Record<string, unknown> = { nom, couleur, initiales };
  if (avatarIcon !== undefined) {
    set.avatarIcon = avatarIcon;
    if (avatarIcon) {
      // Une icône remplace une éventuelle photo
      const m = db.select().from(members).where(eq(members.id, req.params.id)).get();
      if (m?.avatarPhoto) {
        const fp = path.join(avatarsDir, m.avatarPhoto);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      set.avatarPhoto = null;
    }
  }
  db.update(members).set(set).where(eq(members.id, req.params.id)).run();
  res.json({ ok: true });
});

// POST /:id/avatar — uploader une photo de profil
router.post('/:id/avatar', upload.single('file'), (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'Fichier manquant ou invalide' }); return; }
  const m = db.select().from(members).where(eq(members.id, req.params.id)).get();
  if (m?.avatarPhoto) {
    const old = path.join(avatarsDir, m.avatarPhoto);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  db.update(members).set({ avatarPhoto: req.file.filename, avatarIcon: null }).where(eq(members.id, req.params.id)).run();
  res.json({ avatarPhoto: req.file.filename });
});

// DELETE /:id/avatar — revenir aux initiales
router.delete('/:id/avatar', (req, res) => {
  const m = db.select().from(members).where(eq(members.id, req.params.id)).get();
  if (m?.avatarPhoto) {
    const fp = path.join(avatarsDir, m.avatarPhoto);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.update(members).set({ avatarPhoto: null, avatarIcon: null }).where(eq(members.id, req.params.id)).run();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const accs = db.select().from(accounts).where(eq(accounts.memberId, req.params.id)).all();
  if (accs.some(a => !a.archive)) {
    res.status(409).json({ error: 'Archivez d\'abord tous les comptes du membre' });
    return;
  }
  // Suppression en cascade dans une transaction SQLite
  db.transaction(tx => {
    for (const acc of accs) {
      tx.delete(transactions).where(eq(transactions.accountId, acc.id)).run();
      // Supprimer les skips des récurrences de ce compte
      const recs = db.select({ id: recurrences.id }).from(recurrences).where(eq(recurrences.accountId, acc.id)).all();
      for (const r of recs) {
        tx.delete(recurrenceSkips).where(eq(recurrenceSkips.recurrenceId, r.id)).run();
      }
      tx.delete(recurrences).where(eq(recurrences.accountId, acc.id)).run();
      tx.delete(imports).where(eq(imports.accountId, acc.id)).run();
    }
    tx.delete(accounts).where(eq(accounts.memberId, req.params.id)).run();
    tx.delete(members).where(eq(members.id, req.params.id)).run();
  });
  res.json({ ok: true });
});

// Solde total d'un membre (somme de tous ses comptes)
router.get('/:id/balance', (req, res) => {
  const accs = db.select().from(accounts).where(eq(accounts.memberId, req.params.id)).all();
  const total = accs.reduce((s, a) => s + computeBalance(a.id), 0);
  res.json({ total });
});

export default router;
