import { db, sqlite } from './client';
import { members, accounts, categories, recurrences } from './schema';

// Crée les tables si elles n'existent pas (pour dev sans migration)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    couleur TEXT NOT NULL,
    initiales TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id),
    nom TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'courant',
    solde_initial REAL NOT NULL DEFAULT 0,
    previsions_activees INTEGER NOT NULL DEFAULT 0,
    archive INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    icone TEXT NOT NULL,
    hue INTEGER NOT NULL DEFAULT 60
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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS recurrences (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    montant REAL NOT NULL,
    sens TEXT NOT NULL,
    categorie_id TEXT REFERENCES categories(id),
    jour_du_mois INTEGER NOT NULL,
    libelle TEXT NOT NULL DEFAULT ''
  );
`);

// Vérifie si déjà seedé
const existing = db.select().from(members).all();
if (existing.length > 0) {
  console.log('Base déjà seedée, rien à faire.');
  process.exit(0);
}

// Membres
db.insert(members).values([
  { id: 'm_q', nom: 'Quentin', couleur: 'q', initiales: 'Q' },
  { id: 'm_a', nom: 'Anaïs',   couleur: 'a', initiales: 'A' },
  { id: 'm_c', nom: 'Commun',  couleur: 'c', initiales: 'C' },
]).run();

// Comptes
db.insert(accounts).values([
  { id: 'a_q1', memberId: 'm_q', nom: 'Compte courant', type: 'courant', soldeInitial: 1240.00, previsionsActivees: true,  archive: false },
  { id: 'a_q2', memberId: 'm_q', nom: 'Livret A',       type: 'epargne', soldeInitial: 8600.00, previsionsActivees: false, archive: false },
  { id: 'a_a1', memberId: 'm_a', nom: 'Compte courant', type: 'courant', soldeInitial: 980.00,  previsionsActivees: true,  archive: false },
  { id: 'a_a2', memberId: 'm_a', nom: 'Livret jeune',   type: 'epargne', soldeInitial: 4150.00, previsionsActivees: false, archive: false },
  { id: 'a_c1', memberId: 'm_c', nom: 'Compte joint',   type: 'courant', soldeInitial: 2300.00, previsionsActivees: true,  archive: false },
  { id: 'a_c2', memberId: 'm_c', nom: 'Épargne projet', type: 'epargne', soldeInitial: 5400.00, previsionsActivees: false, archive: false },
]).run();

// Catégories
db.insert(categories).values([
  { id: 'c_courses',   nom: 'Courses',        icone: 'shopping-cart', hue: 155 },
  { id: 'c_resto',     nom: 'Restaurant',     icone: 'utensils',      hue: 35  },
  { id: 'c_transport', nom: 'Transport',      icone: 'bus',           hue: 245 },
  { id: 'c_logement',  nom: 'Logement',       icone: 'house',         hue: 45  },
  { id: 'c_energie',   nom: 'Énergie',        icone: 'zap',           hue: 75  },
  { id: 'c_abo',       nom: 'Abonnements',    icone: 'repeat',        hue: 300 },
  { id: 'c_sante',     nom: 'Santé',          icone: 'heart-pulse',   hue: 10  },
  { id: 'c_loisirs',   nom: 'Loisirs',        icone: 'gamepad-2',     hue: 330 },
  { id: 'c_shopping',  nom: 'Shopping',       icone: 'shopping-bag',  hue: 210 },
  { id: 'c_salaire',   nom: 'Salaire',        icone: 'briefcase',     hue: 155 },
  { id: 'c_revenus',   nom: 'Autres revenus', icone: 'piggy-bank',    hue: 165 },
  { id: 'c_divers',    nom: 'Divers',         icone: 'ellipsis',      hue: 60  },
]).run();

// Récurrences
db.insert(recurrences).values([
  { id: 'r1', accountId: 'a_q1', montant: 2380,  sens: 'income',  categorieId: 'c_salaire',  jourDuMois: 27, libelle: 'Salaire'  },
  { id: 'r2', accountId: 'a_q1', montant: 11.99, sens: 'expense', categorieId: 'c_abo',      jourDuMois: 5,  libelle: 'Spotify'  },
  { id: 'r3', accountId: 'a_a1', montant: 2050,  sens: 'income',  categorieId: 'c_salaire',  jourDuMois: 28, libelle: 'Salaire'  },
  { id: 'r4', accountId: 'a_c1', montant: 1150,  sens: 'expense', categorieId: 'c_logement', jourDuMois: 3,  libelle: 'Loyer'    },
  { id: 'r5', accountId: 'a_c1', montant: 79.90, sens: 'expense', categorieId: 'c_energie',  jourDuMois: 8,  libelle: 'EDF'      },
  { id: 'r6', accountId: 'a_c1', montant: 29.99, sens: 'expense', categorieId: 'c_abo',      jourDuMois: 15, libelle: 'Internet' },
]).run();

console.log('Seed effectué : membres, comptes, catégories et récurrences créés.');
