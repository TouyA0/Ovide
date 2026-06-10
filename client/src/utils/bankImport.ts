export type BankType = 'ca' | 'ce' | 'bnp';

export interface ParsedRow {
  date: string;        // YYYY-MM-DD
  libelle: string;
  montant: number;     // négatif = dépense, positif = revenu
  type: 'income' | 'expense';
}

export interface ParseResult {
  bank: BankType;
  bankLabel: string;
  rows: ParsedRow[];
}

const BANK_LABELS: Record<BankType, string> = {
  ca: 'Crédit Agricole',
  ce: "Caisse d'Épargne",
  bnp: 'BNP Paribas',
};

/**
 * Envoie le fichier au serveur pour parsing.
 * Le parsing est fait côté serveur pour éviter les incompatibilités
 * navigateur des librairies de lecture XLS/CSV.
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/parse-bank-file', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erreur serveur (${res.status})`);
  }

  const { bank, rows } = await res.json() as { bank: BankType; rows: ParsedRow[] };
  return { bank, bankLabel: BANK_LABELS[bank] ?? bank, rows };
}
