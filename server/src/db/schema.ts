import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull(),
  couleur: text('couleur').notNull(), // 'q' | 'a' | 'c' | hex oklch hue string
  initiales: text('initiales').notNull(),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  nom: text('nom').notNull(),
  type: text('type').notNull().default('courant'), // 'courant' | 'epargne' | 'autre'
  banque: text('banque'), // nom de la banque (optionnel)
  soldeInitial: real('solde_initial').notNull().default(0),
  previsionsActivees: integer('previsions_activees', { mode: 'boolean' }).notNull().default(false),
  archive: integer('archive', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull(),
  icone: text('icone').notNull(), // nom d'icône Lucide
  hue: integer('hue').notNull().default(60), // hue oklch pour la couleur
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  type: text('type').notNull(), // 'expense' | 'income' | 'transfer'
  montant: real('montant').notNull(),
  categorieId: text('categorie_id').references(() => categories.id),
  libelle: text('libelle').notNull().default(''),
  date: text('date').notNull(), // ISO YYYY-MM-DD
  note: text('note').notNull().default(''),
  transferId: text('transfer_id'), // partagé entre les 2 écritures d'un virement
  dir: text('dir'), // 'in' | 'out' — pour les virements
  recurrenceId: text('recurrence_id').references(() => recurrences.id),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const recurrences = sqliteTable('recurrences', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  montant: real('montant').notNull(),
  sens: text('sens').notNull(), // 'income' | 'expense'
  categorieId: text('categorie_id').references(() => categories.id),
  jourDuMois: integer('jour_du_mois').notNull(), // 1-31
  libelle: text('libelle').notNull().default(''),
  note: text('note').notNull().default(''),
});
