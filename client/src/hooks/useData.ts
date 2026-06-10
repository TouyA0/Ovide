import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Transaction } from '../api/client';
import { useToastStore } from '../components/ui/Toast';

/* Récupère le message d'erreur de l'API ou fallback générique */
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message || 'Une erreur est survenue';
  return 'Une erreur est survenue';
}

function useOnError() {
  const push = useToastStore(s => s.push);
  return (e: unknown) => push(errMsg(e), 'error');
}

/* ── Queries ──────────────────────────────────────────────────── */

export function useMembers() {
  return useQuery({ queryKey: ['members'], queryFn: api.getMembers });
}

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: api.getAccounts });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: api.getCategories });
}

export function useRecurrences(accountId?: string) {
  return useQuery({
    queryKey: ['recurrences', accountId],
    queryFn: () => api.getRecurrences(accountId),
  });
}

export function useTransactions(accountId?: string) {
  return useQuery({
    queryKey: ['transactions', accountId],
    queryFn: () => api.getTransactions(accountId),
  });
}

export function useBalanceSeries(accountId: string, range: 'mois' | 'six' | 'annee') {
  return useQuery({
    queryKey: ['balance-series', accountId, range],
    queryFn: () => api.getBalanceSeries(accountId, range),
  });
}

export function useBars(accountId: string, months = 6) {
  return useQuery({
    queryKey: ['bars', accountId, months],
    queryFn: () => api.getBars(accountId, months),
  });
}

export function useComparison(accountId: string) {
  return useQuery({
    queryKey: ['comparison', accountId],
    queryFn: () => api.getComparison(accountId),
  });
}

export function useDonut(accountId: string) {
  return useQuery({
    queryKey: ['donut', accountId],
    queryFn: () => api.getDonut(accountId),
  });
}

export function useForecast(accountId: string) {
  return useQuery({
    queryKey: ['forecast', accountId],
    queryFn: () => api.getForecast(accountId),
  });
}

/* ── Mutations ────────────────────────────────────────────────── */

export function useCreateTransaction() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: (data: Partial<Transaction>) => api.createTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['balance-series'] });
      qc.invalidateQueries({ queryKey: ['bars'] });
      qc.invalidateQueries({ queryKey: ['comparison'] });
      qc.invalidateQueries({ queryKey: ['donut'] });
      qc.invalidateQueries({ queryKey: ['forecast'] });
    },
    onError,
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => api.updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['balance-series'] });
      qc.invalidateQueries({ queryKey: ['bars'] });
      qc.invalidateQueries({ queryKey: ['comparison'] });
      qc.invalidateQueries({ queryKey: ['donut'] });
      qc.invalidateQueries({ queryKey: ['forecast'] });
    },
    onError,
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['balance-series'] });
      qc.invalidateQueries({ queryKey: ['bars'] });
      qc.invalidateQueries({ queryKey: ['comparison'] });
      qc.invalidateQueries({ queryKey: ['donut'] });
      qc.invalidateQueries({ queryKey: ['forecast'] });
    },
    onError,
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: api.createTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError,
  });
}

export function useTogglePrevisions() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: (id: string) => api.togglePrevisions(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['forecast'] });
      qc.invalidateQueries({ queryKey: ['balance-series'] });
    },
    onError,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
    onError,
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateAccount>[1] }) =>
      api.updateAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
    onError,
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) => api.archiveAccount(id, archive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
    onError,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: api.createMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
    onError,
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateMember>[1] }) =>
      api.updateMember(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
    onError,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError,
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateCategory>[1] }) =>
      api.updateCategory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError,
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError,
  });
}

export function useCreateRecurrence() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: api.createRecurrence,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurrences'] });
      qc.invalidateQueries({ queryKey: ['forecast'] });
    },
    onError,
  });
}

export function useUpdateRecurrence() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateRecurrence>[1] }) =>
      api.updateRecurrence(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurrences'] });
      qc.invalidateQueries({ queryKey: ['forecast'] });
    },
    onError,
  });
}

export function useDeleteRecurrence() {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: (id: string) => api.deleteRecurrence(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurrences'] });
      qc.invalidateQueries({ queryKey: ['forecast'] });
    },
    onError,
  });
}

export function useReorderRecurrences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.reorderRecurrences(ids),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurrences'] }); },
  });
}
