const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Members
  getMembers: () => request<Member[]>('/members'),
  createMember: (data: Partial<Member>) => request<{ id: string }>('/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: Partial<Member>) => request('/members/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string) => request('/members/' + id, { method: 'DELETE' }),

  // Accounts
  getAccounts: () => request<Account[]>('/accounts'),
  getAccount: (id: string) => request<Account>('/accounts/' + id),
  createAccount: (data: Partial<Account>) => request<{ id: string }>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: Partial<Account>) => request('/accounts/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  togglePrevisions: (id: string) => request<{ previsionsActivees: boolean }>('/accounts/' + id + '/previsions', { method: 'PATCH' }),
  archiveAccount: (id: string, archive: boolean) => request('/accounts/' + id + '/archive', { method: 'PATCH', body: JSON.stringify({ archive }) }),

  // Transactions
  getTransactions: (accountId?: string) => request<Transaction[]>('/transactions' + (accountId ? `?accountId=${accountId}` : '')),
  createTransaction: (data: Partial<Transaction>) => request<{ id: string }>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: Partial<Transaction>) => request('/transactions/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => request('/transactions/' + id, { method: 'DELETE' }),

  // Transfers
  createTransfer: (data: { fromId: string; toId: string; montant: number; date: string; libelle: string; note: string; categorieId?: string | null }) =>
    request<{ transferId: string }>('/transfers', { method: 'POST', body: JSON.stringify(data) }),

  // Categories
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (data: Partial<Category>) => request<{ id: string }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<Category>) => request('/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request('/categories/' + id, { method: 'DELETE' }),

  // Recurrences
  getRecurrences: (accountId?: string) => request<Recurrence[]>('/recurrences' + (accountId ? `?accountId=${accountId}` : '')),
  createRecurrence: (data: Partial<Recurrence>) => request<{ id: string }>('/recurrences', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurrence: (id: string, data: Partial<Recurrence>) => request('/recurrences/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecurrence: (id: string) => request('/recurrences/' + id, { method: 'DELETE' }),
  reorderRecurrences: (ids: string[]) => request('/recurrences/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) }),
  skipRecurrence: (id: string, monthPrefix: string) => request('/recurrences/' + id + '/skip', { method: 'POST', body: JSON.stringify({ monthPrefix }) }),
  unskipRecurrence: (id: string, monthPrefix: string) => request('/recurrences/' + id + '/skip?monthPrefix=' + monthPrefix, { method: 'DELETE' }),

  // Imports
  getImports: (accountId: string) => request<BankImport[]>('/imports?accountId=' + accountId),
  createImport: (data: { accountId: string; filename: string; bankName: string; txs: { date: string; libelle: string; montant: number; type: 'income' | 'expense' }[] }) =>
    request<{ id: string; transactionCount: number }>('/imports', { method: 'POST', body: JSON.stringify(data) }),
  deleteImport: (id: string) => request('/imports/' + id, { method: 'DELETE' }),

  // Stats
  getBalanceSeries: (accountId: string, range: 'mois' | 'six' | 'annee') =>
    request<{ series: BalancePoint[]; projection: BalancePoint[] }>(`/stats/${accountId}/balance-series?range=${range}`),
  getBars: (accountId: string, months?: number) =>
    request<BarPoint[]>(`/stats/${accountId}/bars?months=${months ?? 6}`),
  getComparison: (accountId: string) =>
    request<ComparisonData>(`/stats/${accountId}/comparison`),
  getDonut: (accountId: string) =>
    request<DonutSlice[]>(`/stats/${accountId}/donut`),
  getForecast: (accountId: string) =>
    request<ForecastItem[]>(`/stats/${accountId}/forecast`),

  // Export
  exportCsv: (accountId: string) => `${BASE}/export/${accountId}/csv`,
};

/* ---- Types ---- */
export interface Member {
  id: string;
  nom: string;
  couleur: string;
  initiales: string;
}

export interface Account {
  id: string;
  memberId: string;
  nom: string;
  type: 'courant' | 'epargne' | 'autre';
  banque: string | null;
  soldeInitial: number;
  previsionsActivees: boolean;
  archive: boolean;
  balance: number;
}

export interface Category {
  id: string;
  nom: string;
  icone: string;
  hue: number;
  type: 'expense' | 'income';
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'expense' | 'income' | 'transfer';
  montant: number;
  categorieId: string | null;
  libelle: string;
  date: string;
  note: string;
  transferId: string | null;
  dir: 'in' | 'out' | null;
  recurrenceId: string | null;
  linkedAccountId: string | null;
}

export interface Recurrence {
  id: string;
  accountId: string;
  montant: number;
  sens: 'income' | 'expense';
  categorieId: string | null;
  jourDuMois: number;
  libelle: string;
  note: string;
  position: number;
}

export interface BalancePoint { label: string; value: number; }
export interface BarPoint { label: string; income: number; expense: number; }
export interface ComparisonData {
  cur: { income: number; expense: number; net: number };
  prev: { income: number; expense: number; net: number };
}
export interface DonutSlice { categorieId: string | null; total: number; }
export interface ForecastItem extends Recurrence { date: string; day: number; }

export interface BankImport {
  id: string;
  accountId: string;
  filename: string;
  bankName: string;
  importedAt: string;
  transactionCount: number;
}
