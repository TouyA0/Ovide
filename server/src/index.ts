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

// Création du schéma initial (idempotent — IF NOT EXISTS)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    couleur TEXT NOT NULL,
    initiales TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    icone TEXT NOT NULL,
    hue INTEGER NOT NULL DEFAULT 60,
    type TEXT NOT NULL DEFAULT 'expense',
    position INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id),
    nom TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'courant',
    banque TEXT,
    solde_initial REAL NOT NULL DEFAULT 0,
    previsions_activees INTEGER NOT NULL DEFAULT 0,
    archive INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    type TEXT NOT NULL,
    montant REAL NOT NULL,
    categorie_id TEXT REFERENCES categories(id),
    libelle TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    transfer_id TEXT,
    dir TEXT,
    recurrence_id TEXT,
    import_id TEXT,
    receipt_path TEXT,
    created_at TEXT NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
  );
  CREATE TABLE IF NOT EXISTS recurrences (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    montant REAL NOT NULL,
    sens TEXT NOT NULL,
    categorie_id TEXT REFERENCES categories(id),
    jour_du_mois INTEGER NOT NULL,
    libelle TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT '2000-01-01'
  );
  CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS recurrence_skips (
    id TEXT PRIMARY KEY,
    recurrence_id TEXT NOT NULL,
    month_prefix TEXT NOT NULL
  );
`);

// Migrations légères au démarrage (colonnes ajoutées après le seed initial)
try { sqlite.exec('ALTER TABLE accounts ADD COLUMN banque TEXT'); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE transactions ADD COLUMN recurrence_id TEXT'); } catch { /* déjà présente */ }
try { sqlite.exec("ALTER TABLE recurrences ADD COLUMN note TEXT NOT NULL DEFAULT ''"); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE recurrences ADD COLUMN position INTEGER NOT NULL DEFAULT 0'); } catch { /* déjà présente */ }
// created_at sur les récurrences — les lignes existantes gardent '2000-01-01' (pas de restriction rétroactive)
try { sqlite.exec("ALTER TABLE recurrences ADD COLUMN created_at TEXT NOT NULL DEFAULT '2000-01-01'"); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE transactions ADD COLUMN import_id TEXT'); } catch { /* déjà présente */ }
try { sqlite.exec("ALTER TABLE categories ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'"); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE categories ADD COLUMN position INTEGER NOT NULL DEFAULT 0'); } catch { /* déjà présente */ }
// Marquer les catégories d'entrées connues si elles existent encore
try { sqlite.exec("UPDATE categories SET type='income' WHERE id IN ('c_salaire','c_revenus')"); } catch { /* */ }
try { sqlite.exec(`CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0
)`); } catch { /* déjà présente */ }
try { sqlite.exec(`CREATE TABLE IF NOT EXISTS recurrence_skips (
  id TEXT PRIMARY KEY,
  recurrence_id TEXT NOT NULL,
  month_prefix TEXT NOT NULL
)`); } catch { /* déjà présente */ }
try { sqlite.exec('ALTER TABLE transactions ADD COLUMN receipt_path TEXT'); } catch { /* déjà présente */ }

// Répertoire de stockage des pièces jointes
export const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'receipts');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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

// Sert les pièces jointes (derrière le middleware d'auth)
app.get('/api/receipts/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // protection path traversal
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'Fichier introuvable' }); return; }
  res.sendFile(filePath);
});

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
