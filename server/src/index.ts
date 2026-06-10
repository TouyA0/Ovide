import express from 'express';
import path from 'path';
import { cfAccessMiddleware } from './middleware/cfAccess';
import { sqlite } from './db/client';
import membersRouter from './routes/members';
import accountsRouter from './routes/accounts';
import transactionsRouter from './routes/transactions';
import transfersRouter from './routes/transfers';
import categoriesRouter from './routes/categories';
import recurrencesRouter from './routes/recurrences';
import statsRouter from './routes/stats';
import exportRouter from './routes/export';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Migrations légères au démarrage (colonnes ajoutées après le seed initial)
try { sqlite.exec('ALTER TABLE accounts ADD COLUMN banque TEXT'); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE transactions ADD COLUMN recurrence_id TEXT'); } catch { /* déjà présente */ }

app.use(express.json());

// Vérification JWT Cloudflare Access sur toutes les routes
app.use(cfAccessMiddleware);

// API
app.use('/api/members', membersRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/recurrences', recurrencesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/export', exportRouter);

// Sert le build React en production
const clientDist = path.join(__dirname, '..', 'public');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ovide server running on http://localhost:${PORT}`);
});
