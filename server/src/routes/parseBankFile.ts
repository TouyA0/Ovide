import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Types ──────────────────────────────────────────────────────────────────
type BankType = 'ca' | 'ce' | 'bnp';

interface ParsedRow {
  date: string;    // YYYY-MM-DD
  libelle: string;
  montant: number; // négatif = dépense, positif = revenu
  type: 'income' | 'expense';
}

// ── Utilitaires ────────────────────────────────────────────────────────────
function parseDate(s: string): string {
  const [d, m, y] = s.trim().split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.').replace('+', '')) || 0;
}

function cleanLibelle(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function parseCSV(text: string, sep = ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuote = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { inQuote = false; i++; continue; }
      field += ch;
    } else {
      if (ch === '"') { inQuote = true; i++; continue; }
      if (ch === sep) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch;
    }
    i++;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── Crédit Agricole ────────────────────────────────────────────────────────
function parseCA(buffer: Buffer): ParsedRow[] {
  const text = buffer.toString('latin1');
  const rows = parseCSV(text);
  const headerIdx = rows.findIndex(r =>
    r[0]?.trim().toLowerCase().startsWith('date') &&
    r.some(c => c.toLowerCase().includes('bit'))
  );
  if (headerIdx === -1) throw new Error('Format Crédit Agricole non reconnu');

  const result: ParsedRow[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row[0]?.trim().match(/^\d{2}\/\d{2}\/\d{4}$/)) continue;
    const date = parseDate(row[0].trim());
    const libelle = cleanLibelle(row[1] ?? '');
    const debit = row[2]?.trim();
    const credit = row[3]?.trim();
    if (!debit && !credit) continue;
    const montant = debit ? -Math.abs(parseAmount(debit)) : Math.abs(parseAmount(credit));
    if (montant === 0) continue;
    result.push({ date, libelle, montant, type: montant < 0 ? 'expense' : 'income' });
  }
  return result;
}

// ── Caisse d'Épargne ───────────────────────────────────────────────────────
function parseCE(buffer: Buffer): ParsedRow[] {
  const text = buffer.toString('latin1');
  const rows = parseCSV(text);
  const headerIdx = rows.findIndex(r =>
    r[0]?.toLowerCase().includes('date') &&
    r.some(c => c.toLowerCase().includes('libelle'))
  );
  if (headerIdx === -1) throw new Error("Format Caisse d'Épargne non reconnu");

  const header = rows[headerIdx].map(h => h.toLowerCase().trim());
  const iDate = header.findIndex(h => h.includes('comptabilisation') || h.startsWith('date'));
  const iLib = header.findIndex(h => h.includes('simplifie') || h.includes('libelle'));
  const iDebit = header.findIndex(h => h === 'debit');
  const iCredit = header.findIndex(h => h === 'credit');

  const result: ParsedRow[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const rawDate = row[iDate]?.trim();
    if (!rawDate?.match(/^\d{2}\/\d{2}\/\d{4}$/)) continue;
    const date = parseDate(rawDate);
    const libelle = cleanLibelle(row[iLib] ?? '');
    const debitStr = row[iDebit]?.trim();
    const creditStr = row[iCredit]?.trim();
    if (!debitStr && !creditStr) continue;
    const montant = debitStr ? parseAmount(debitStr) : Math.abs(parseAmount(creditStr));
    if (montant === 0) continue;
    result.push({ date, libelle, montant, type: montant < 0 ? 'expense' : 'income' });
  }
  return result;
}

// ── BNP Paribas (XLS/XLSX) ─────────────────────────────────────────────────
function parseBNP(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true }) as unknown[][];

  const headerIdx = raw.findIndex(r =>
    Array.isArray(r) && r.some(c => typeof c === 'string' && c.toLowerCase().includes('date op'))
  );
  if (headerIdx === -1) throw new Error('Format BNP non reconnu');

  const header = (raw[headerIdx] as unknown[]).map(h => String(h ?? '').toLowerCase().trim());
  const iDate = header.findIndex(h => h.includes('date op'));
  const iLib = header.findIndex(h => h.includes('libell'));
  const iMontant = header.findIndex(h => h.includes('montant'));

  const result: ParsedRow[] = [];
  for (const row of raw.slice(headerIdx + 1) as unknown[][]) {
    const rawDate = row[iDate];
    if (!rawDate) continue;

    let date: string;
    if (rawDate instanceof Date) {
      date = rawDate.toISOString().slice(0, 10);
    } else {
      const s = String(rawDate).trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        // DD/MM/YYYY
        date = parseDate(s);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        // DD-MM-YYYY (format BNP)
        const [d, m, y] = s.split('-');
        date = `${y}-${m}-${d}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        // YYYY-MM-DD déjà bon
        date = s;
      } else if (/^\d+$/.test(s)) {
        // Numéro de série Excel (jours depuis 1899-12-30)
        const d = new Date(Date.UTC(1899, 11, 30) + parseInt(s) * 86400000);
        date = d.toISOString().slice(0, 10);
      } else continue;
    }

    const libelle = cleanLibelle(String(row[iLib] ?? ''));
    const rawMontant = row[iMontant];
    const montant = typeof rawMontant === 'number'
      ? rawMontant
      : parseFloat(String(rawMontant ?? '').replace(',', '.').replace(/\s/g, ''));
    if (!montant || isNaN(montant)) continue;
    result.push({ date, libelle, montant, type: montant < 0 ? 'expense' : 'income' });
  }
  return result;
}

// ── POST /api/parse-bank-file ──────────────────────────────────────────────
router.post('/', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'Fichier manquant' }); return; }

    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const buf = file.buffer;
    let bank: BankType;
    let rows: ParsedRow[];

    if (ext === 'xls' || ext === 'xlsx') {
      rows = parseBNP(buf);
      bank = 'bnp';
    } else {
      // CSV — détecter CA vs CE au contenu
      const text = buf.toString('latin1');
      const isCA = text.includes('Débit euros') || text.toLowerCase().includes('debit euros') ||
        text.includes('Crédit euros') || /Date;[^;]*[Ll]ibell/.test(text);
      const isCE = text.toLowerCase().includes('date de comptabilisation') ||
        text.toLowerCase().includes('libelle simplifie');

      if (isCE) { rows = parseCE(buf); bank = 'ce'; }
      else if (isCA) { rows = parseCA(buf); bank = 'ca'; }
      else {
        // Tentative générique
        try { rows = parseCE(buf); bank = 'ce'; }
        catch { rows = parseCA(buf); bank = 'ca'; }
      }
    }

    res.json({ bank, rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur de lecture du fichier';
    res.status(422).json({ error: msg });
  }
});

export default router;
