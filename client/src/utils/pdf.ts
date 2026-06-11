import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MONTHS_FULL } from './format';
import type { Account, Member, Category, Transaction } from '../api/client';

function fmtAmountPdf(n: number): string {
  const v = Math.abs(n);
  const [intPart, decPart] = v.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return grouped + ',' + decPart + ' EUR';
}

function fmtDateFr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function groupByMonth(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = t.date.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function exportMonthlyPDF(acc: Account, member: Member, categories: Category[], txs: Transaction[], monthPrefix: string | null) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const periodTxs = (monthPrefix ? txs.filter(t => t.date.startsWith(monthPrefix)) : txs)
    .filter(t => t.accountId === acc.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  let income = 0;
  let expense = 0;
  for (const t of periodTxs) {
    if (t.type === 'income') income += t.montant;
    else if (t.type === 'expense') expense += t.montant;
    else if (t.type === 'transfer') {
      if (t.dir === 'in') income += t.montant;
      else expense += t.montant;
    }
  }
  const net = income - expense;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  let periodLabel: string;
  if (monthPrefix) {
    const [year, month] = monthPrefix.split('-').map(Number);
    periodLabel = `${MONTHS_FULL[month - 1]} ${year}`;
  } else {
    periodLabel = periodTxs.length
      ? `${fmtDateFr(periodTxs[0].date)} - ${fmtDateFr(periodTxs[periodTxs.length - 1].date)}`
      : 'Aucune operation';
  }

  // En-tete
  doc.setFillColor(124, 92, 232);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(monthPrefix ? 'Rapport mensuel' : 'Rapport complet', marginX, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${acc.nom} - ${member.nom}`, marginX, 24);
  doc.setFontSize(10);
  doc.setTextColor(235, 230, 255);
  doc.text(periodLabel, marginX, 31);

  // Cartes resume
  const summaryY = 50;
  const cardH = 24;
  const gap = 6;
  const cardW = (pageWidth - marginX * 2 - gap * 2) / 3;
  const summary: [string, string, [number, number, number]][] = [
    ['Entrees', '+' + fmtAmountPdf(income), [22, 163, 74]],
    ['Depenses', '-' + fmtAmountPdf(expense), [220, 38, 38]],
    ['Solde net', (net >= 0 ? '+' : '-') + fmtAmountPdf(net), net >= 0 ? [22, 163, 74] : [220, 38, 38]],
  ];
  summary.forEach(([label, value, color], i) => {
    const x = marginX + i * (cardW + gap);
    doc.setFillColor(246, 245, 251);
    doc.roundedRect(x, summaryY, cardW, cardH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 150);
    doc.text(label.toUpperCase(), x + 6, summaryY + 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...color);
    doc.text(value, x + 6, summaryY + 18);
  });

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 175);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Foyer - genere le ${fmtDateFr(new Date().toISOString().slice(0, 10))} - page ${pageCount}`,
      marginX, pageHeight - 8
    );
  };

  const drawTable = (rows: Transaction[], startY: number) => {
    autoTable(doc, {
      startY,
      margin: { left: marginX, right: marginX },
      head: [['Date', 'Categorie', 'Libelle', 'Montant']],
      body: rows.map(t => {
        const cat = t.categorieId ? catMap[t.categorieId] : null;
        const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '-' : (t.dir === 'in' ? '+' : '-');
        const label = t.libelle || (cat ? cat.nom : (t.type === 'transfer' ? 'Virement' : ''));
        return [
          t.date.split('-')[2],
          cat ? cat.nom : (t.type === 'transfer' ? 'Virement' : '-'),
          label + (t.note ? ` - ${t.note}` : ''),
          sign + fmtAmountPdf(t.montant),
        ];
      }),
      headStyles: { fillColor: [124, 92, 232], textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
      alternateRowStyles: { fillColor: [248, 247, 252] },
      styles: { fontSize: 9, cellPadding: 4.5, lineColor: [235, 234, 240], lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 32 },
        3: { cellWidth: 32, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const txt = String(data.cell.raw);
          data.cell.styles.textColor = txt.startsWith('+') ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: drawFooter,
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  if (monthPrefix) {
    drawTable(periodTxs, summaryY + cardH + 10);
  } else {
    let cursorY = summaryY + cardH + 10;
    for (const [key, monthTxs] of groupByMonth(periodTxs)) {
      const [y, m] = key.split('-').map(Number);

      if (cursorY > pageHeight - 40) {
        doc.addPage();
        cursorY = 20;
      }

      doc.setFillColor(124, 92, 232);
      doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 9, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${MONTHS_FULL[m - 1].toUpperCase()} ${y}`, marginX + 4, cursorY + 6.3);
      cursorY += 9 + 4;

      cursorY = drawTable(monthTxs, cursorY) + 10;
    }
  }

  const filename = `${member.nom}_${acc.nom}_${monthPrefix ?? 'complet'}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}
