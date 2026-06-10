import { Router } from 'express';
import { db } from '../db/client';
import { accounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getBalanceSeries, getMonthBars, getComparison, getCategoryDonut, getGlobalStats } from '../services/stats';
import { buildForecast } from '../services/forecast';

const router = Router();

const today = () => new Date().toISOString().slice(0, 10);

router.get('/global', (req, res) => {
  const allAccounts = db.select({ id: accounts.id, memberId: accounts.memberId })
    .from(accounts).where(eq(accounts.archive, false)).all();
  const accountIds = allAccounts.map(a => a.id);
  const byMember: Record<string, string[]> = {};
  for (const a of allAccounts) {
    const mid = a.memberId!;
    if (!byMember[mid]) byMember[mid] = [];
    byMember[mid].push(a.id);
  }
  res.json(getGlobalStats(accountIds, byMember, today()));
});

router.get('/:accountId/balance-series', (req, res) => {
  const acc = db.select().from(accounts).where(eq(accounts.id, req.params.accountId)).get();
  if (!acc) { res.status(404).json({ error: 'Compte introuvable' }); return; }
  const range = (req.query.range as 'mois' | 'six' | 'annee') ?? 'six';
  res.json(getBalanceSeries(acc.id, acc.soldeInitial, range, today(), acc.previsionsActivees ?? false));
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
