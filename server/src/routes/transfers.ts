import { Router } from 'express';
import { db } from '../db/client';
import { transactions } from '../db/schema';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/', (req, res) => {
  const { fromId, toId, montant, date, libelle, note, categorieId, categorieIdDest } = req.body;
  if (!fromId || !toId || !montant || !date) {
    res.status(400).json({ error: 'fromId, toId, montant et date requis' });
    return;
  }
  if (fromId === toId) {
    res.status(400).json({ error: 'Les deux comptes doivent être différents' });
    return;
  }

  const transferId = 'trf_' + randomUUID().slice(0, 12);
  const amount = Math.abs(Number(montant));
  const label = libelle ?? 'Virement';
  const txNote = note ?? '';

  db.insert(transactions).values([
    { id: 'tx_' + randomUUID().slice(0, 12), accountId: fromId, type: 'transfer', montant: amount, categorieId: categorieId ?? null, libelle: label, date, note: txNote, transferId, dir: 'out' },
    { id: 'tx_' + randomUUID().slice(0, 12), accountId: toId,   type: 'transfer', montant: amount, categorieId: categorieIdDest ?? null, libelle: label, date, note: txNote, transferId, dir: 'in'  },
  ]).run();

  res.status(201).json({ transferId });
});

export default router;
