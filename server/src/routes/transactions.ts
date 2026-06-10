import { Router } from 'express';
import { db, sqlite } from '../db/client';
import { transactions } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadsDir } from '../index';

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      cb(null, `receipt_${req.params.id}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//i.test(file.mimetype) || file.mimetype === 'application/pdf';
    cb(null, ok);
  },
});

const router = Router();

// GET /transactions?accountId=xxx
router.get('/', (req, res) => {
  const { accountId } = req.query;
  if (accountId) {
    const rows = db.select().from(transactions)
      .where(eq(transactions.accountId, accountId as string))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .all();

    // Enrichit les virements avec linkedAccountId
    const transferIds = [...new Set(rows.filter(r => r.transferId).map(r => r.transferId!))];
    let partnerMap: Record<string, string> = {};
    if (transferIds.length > 0) {
      const placeholders = transferIds.map(() => '?').join(',');
      const stmt = sqlite.prepare<unknown[], { transfer_id: string; account_id: string }>(
        `SELECT transfer_id, account_id FROM transactions WHERE transfer_id IN (${placeholders}) AND account_id != ?`
      );
      const partners = stmt.all(...transferIds, accountId as string);
      partnerMap = Object.fromEntries(partners.map(p => [p.transfer_id, p.account_id]));
    }

    res.json(rows.map(r => ({
      ...r,
      linkedAccountId: r.transferId ? (partnerMap[r.transferId] ?? null) : null,
    })));
    return;
  }
  res.json(db.select().from(transactions).orderBy(desc(transactions.date), desc(transactions.createdAt)).all());
});

router.post('/', (req, res) => {
  const { accountId, type, montant, categorieId, libelle, date, note, recurrenceId } = req.body;
  if (!accountId || !type || !montant || !date) {
    res.status(400).json({ error: 'accountId, type, montant et date requis' });
    return;
  }
  if (!['expense', 'income'].includes(type)) {
    res.status(400).json({ error: 'type doit être expense ou income (les virements passent par /transfers)' });
    return;
  }
  const id = 'tx_' + randomUUID().slice(0, 12);
  db.insert(transactions).values({
    id, accountId, type,
    montant: Math.abs(Number(montant)),
    categorieId: categorieId ?? null,
    libelle: libelle ?? '',
    date,
    note: note ?? '',
    transferId: null,
    dir: null,
    recurrenceId: recurrenceId ?? null,
  }).run();
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { type, montant, categorieId, libelle, date, note } = req.body;
  const tx = db.select().from(transactions).where(eq(transactions.id, req.params.id)).get();
  if (!tx) { res.status(404).json({ error: 'Transaction introuvable' }); return; }

  if (tx.type === 'transfer' && tx.transferId) {
    // Modifie les 2 écritures liées
    db.update(transactions)
      .set({ montant: Math.abs(Number(montant)), libelle: libelle ?? tx.libelle, date: date ?? tx.date })
      .where(eq(transactions.transferId, tx.transferId))
      .run();
  } else {
    db.update(transactions)
      .set({ type, montant: Math.abs(Number(montant)), categorieId, libelle, date, note })
      .where(eq(transactions.id, req.params.id))
      .run();
  }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const tx = db.select().from(transactions).where(eq(transactions.id, req.params.id)).get();
  if (!tx) { res.status(404).json({ error: 'Transaction introuvable' }); return; }

  // Supprimer la pièce jointe si elle existe
  if (tx.receiptPath) {
    const fp = path.join(uploadsDir, tx.receiptPath);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  if (tx.type === 'transfer' && tx.transferId) {
    db.delete(transactions).where(eq(transactions.transferId, tx.transferId)).run();
  } else {
    db.delete(transactions).where(eq(transactions.id, req.params.id)).run();
  }
  res.json({ ok: true });
});

// POST /:id/receipt — attacher une pièce jointe
router.post('/:id/receipt', upload.single('file'), (req, res) => {
  const tx = db.select().from(transactions).where(eq(transactions.id, req.params.id)).get();
  if (!tx) { if (req.file) fs.unlinkSync(req.file.path); res.status(404).json({ error: 'Transaction introuvable' }); return; }
  if (!req.file) { res.status(400).json({ error: 'Fichier requis' }); return; }

  // Supprimer l'ancien fichier si présent
  if (tx.receiptPath) {
    const old = path.join(uploadsDir, tx.receiptPath);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  db.update(transactions).set({ receiptPath: req.file.filename }).where(eq(transactions.id, req.params.id)).run();
  res.json({ receiptPath: req.file.filename });
});

// DELETE /:id/receipt — supprimer la pièce jointe
router.delete('/:id/receipt', (req, res) => {
  const tx = db.select().from(transactions).where(eq(transactions.id, req.params.id)).get();
  if (!tx) { res.status(404).json({ error: 'Transaction introuvable' }); return; }

  if (tx.receiptPath) {
    const fp = path.join(uploadsDir, tx.receiptPath);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.update(transactions).set({ receiptPath: null }).where(eq(transactions.id, req.params.id)).run();
  }
  res.json({ ok: true });
});

export default router;
