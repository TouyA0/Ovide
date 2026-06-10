import express from 'express';
import path from 'path';
import fs from 'fs';
import { cfAccessMiddleware } from './middleware/cfAccess';
import { sqlite } from './db/client';
import membersRouter from './routes/members';
import accountsRouter from './routes/accounts';
import transactionsRouter from './routes/transactions';
import transfersRouter from './routes/transfers';
import categoriesRouter from './routes/categories';
import recurrencesRouter from './routes/recurrences';
import importsRouter from './routes/imports';
import parseBankFileRouter from './routes/parseBankFile';
import statsRouter from './routes/stats';
import exportRouter from './routes/export';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Migrations légères au démarrage (colonnes ajoutées après le seed initial)
try { sqlite.exec('ALTER TABLE accounts ADD COLUMN banque TEXT'); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE transactions ADD COLUMN recurrence_id TEXT'); } catch { /* déjà présente */ }
try { sqlite.exec("ALTER TABLE recurrences ADD COLUMN note TEXT NOT NULL DEFAULT ''"); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE recurrences ADD COLUMN position INTEGER NOT NULL DEFAULT 0'); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE transactions ADD COLUMN import_id TEXT'); } catch { /* déjà présente */ }
try { sqlite.exec(`CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0
)`); } catch { /* déjà présente */ }

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
app.use('/api/imports', importsRouter);
app.use('/api/parse-bank-file', parseBankFileRouter);
app.use('/api/stats', statsRouter);
app.use('/api/export', exportRouter);

// Sert le build React en production (ignoré en dev si le dossier n'existe pas)
const clientDist = path.join(__dirname, '..', 'public');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`Ovide server running on http://localhost:${PORT}`);
});

// Fermeture propre pour que tsx watch puisse redémarrer sans EADDRINUSE
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
