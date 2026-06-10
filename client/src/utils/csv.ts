import type { Account, Member, Category, Transaction } from '../api/client';

export function exportCSV(acc: Account, member: Member, categories: Category[], txs: Transaction[]) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const rows: string[][] = [['Date', 'Type', 'Montant', 'Catégorie', 'Libellé', 'Note']];

  txs
    .filter(t => t.accountId === acc.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(t => {
      const cat = t.categorieId ? catMap[t.categorieId] : null;
      const sign = t.type === 'income' ? '' : t.type === 'expense' ? '-' : (t.dir === 'in' ? '' : '-');
      rows.push([
        t.date, t.type,
        sign + t.montant.toFixed(2).replace('.', ','),
        cat ? cat.nom : (t.type === 'transfer' ? 'Virement' : ''),
        (t.libelle ?? '').replace(/"/g, '""'),
        (t.note ?? '').replace(/"/g, '""'),
      ]);
    });

  const csv = rows.map(r => r.map(v => /[;"\n,]/.test(v) ? `"${v}"` : v).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${member.nom}_${acc.nom}.csv`.replace(/\s+/g, '_');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
