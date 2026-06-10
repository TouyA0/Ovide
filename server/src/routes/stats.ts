import { Router } from 'express';
import { db } from '../db/client';
import { accounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getBalanceSeries, getMonthBars, getComparison, getCategoryDonut } from '../services/stats';
import { buildForecast } from '../services/forecast';

const router = Router();

const today = () => new Date().toISOString().slice(0, 10);

router.get('/:accountId/balance-series', (req, res) => {
  const acc = db.select().from(accounts).where(eq(accounts.id, req.params.accountId)).get();
  if (!acc) { res.status(404).json({ error: 'Compte introuvable' }); return; }
  const range = (req.query.range as 'mois' | 'six' | 'annee') ?? 'six';
  res.json(getBalanceSeries(acc.id, acc.soldeInitial, range, today()));
});

router.get('/:accountId/bars', (req, res) => {
  const months = Number(req.query.months) || 6;
  res.json(getMonthBars(req.params.accountId, months, today()));
});

router.get('/:accountId/comparison', (req, res) => {
  res.json(getComparison(req.params.accountId, today()));
});

router.get('/:accountId/donut', (req, res) => {
  res.json(getCategoryDonut(req.params.accountId, today()));
});

router.get('/:accountId/forecast', (req, res) => {
  res.json(buildForecast(req.params.accountId, today()));
});

export default router;
