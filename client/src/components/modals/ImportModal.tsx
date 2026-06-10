import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from './Modal';
import { parseFile } from '../../utils/bankImport';
import type { ParseResult } from '../../utils/bankImport';
import { fmtEur } from '../../utils/format';

interface Props {
  accountId: string;
  accountName: string;
  isPending?: boolean;
  onClose: () => void;
  onImport: (data: { filename: string; bankName: string; txs: ParseResult['rows'] }) => void;
}

const BANK_LABELS: Record<string, string> = { ca: 'Crédit Agricole', ce: 'Caisse d\'Épargne', bnp: 'BNP Paribas' };

export function ImportModal({ accountId: _accountId, accountName, isPending, onClose, onImport }: Props) {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setParsed(null);
    console.log('[Import] handleFile:', file.name, file.size, 'bytes');
    try {
      const result = await parseFile(file);
      console.log('[Import] parsed ok:', result.bank, result.rows.length, 'rows');
      if (result.rows.length === 0) {
        setError('Aucune opération trouvée dans ce fichier. Vérifiez le format.');
        return;
      }
      setParsed(result);
      setFilename(file.name);
    } catch (e) {
      console.error('[Import] error:', e);
      setError(e instanceof Error ? e.message : 'Erreur de lecture du fichier');
    } finally {
      setLoading(false);
    }
  };

  // Empêche le navigateur de naviguer vers le fichier si on rate la drop zone
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    const onDocDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && !parsed && !loading) handleFile(file);
    };
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', onDocDrop);
    return () => {
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', onDocDrop);
    };
  }, [parsed, loading]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const stats = parsed && parsed.rows.length > 0 ? {
    income: parsed.rows.filter(r => r.type === 'income').reduce((s, r) => s + r.montant, 0),
    expense: parsed.rows.filter(r => r.type === 'expense').reduce((s, r) => s + Math.abs(r.montant), 0),
    dateMin: parsed.rows.map(r => r.date).sort()[0] ?? '',
    dateMax: parsed.rows.map(r => r.date).sort().reverse()[0] ?? '',
  } : null;

  const preview = parsed ? (showAll ? parsed.rows : parsed.rows.slice(0, 8)) : [];
  const fmtDate = (s: string) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };

  return (
    <Modal title="Importer un relevé bancaire" onClose={onClose}>
      <div className="modal-body">
        {!parsed && (
          <>
            <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
              Formats supportés&nbsp;: <strong>Crédit Agricole</strong> (CSV), <strong>Caisse d'Épargne</strong> (CSV), <strong>BNP Paribas</strong> (XLS/XLSX).
            </p>
            <div
              className={`import-drop${loading ? ' loading' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              {loading
                ? <Loader2 size={28} className="spin" style={{ color: 'var(--accent)' }} />
                : <><Upload size={28} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Déposer le fichier ici</span>
                  <span className="muted" style={{ fontSize: 12 }}>ou cliquer pour parcourir</span></>}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--neg-soft)', borderRadius: 'var(--r-md)', color: 'var(--neg)', fontSize: 13, marginTop: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
          </>
        )}

        {parsed && stats && (
          <>
            {/* Résumé */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
              <FileText size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</div>
                <div className="muted" style={{ fontSize: 12 }}>{BANK_LABELS[parsed.bank]} · {accountName}</div>
              </div>
              <button className="btn ghost sm" onClick={() => { setParsed(null); setFilename(''); }}>Changer</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Opérations', value: String(parsed.rows.length), neutral: true },
                { label: 'Entrées', value: '+' + fmtEur(stats.income), pos: true },
                { label: 'Dépenses', value: '−' + fmtEur(stats.expense), neg: true },
              ].map((c, i) => (
                <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '8px 10px' }}>
                  <div className="muted" style={{ fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: c.pos ? 'var(--pos)' : c.neg ? 'var(--neg)' : 'var(--text)' }}>{c.value}</div>
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Période : {fmtDate(stats.dateMin)} → {fmtDate(stats.dateMax)}
            </div>

            {/* Aperçu */}
            <div className="field-label">Aperçu</div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {preview.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: i < preview.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 12.5 }}>
                  <span className="muted tnum" style={{ width: 70, flexShrink: 0 }}>{fmtDate(r.date)}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.libelle || '—'}</span>
                  <span style={{ fontWeight: 700, flexShrink: 0, color: r.type === 'income' ? 'var(--pos)' : 'var(--neg)' }}>
                    {r.type === 'income' ? '+' : '−'}{fmtEur(Math.abs(r.montant))}
                  </span>
                </div>
              ))}
            </div>
            {parsed.rows.length > 8 && (
              <button className="btn ghost sm" style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}
                onClick={() => setShowAll(v => !v)}>
                {showAll ? <><ChevronUp size={13} /> Réduire</> : <><ChevronDown size={13} /> Voir les {parsed.rows.length - 8} autres</>}
              </button>
            )}
          </>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={!!isPending}>Annuler</button>
        <button className="btn primary" disabled={!parsed || !!isPending}
          onClick={() => parsed && onImport({ filename, bankName: parsed.bank, txs: parsed.rows })}>
          {isPending
            ? <><Loader2 size={15} className="spin" /> Import en cours…</>
            : parsed
              ? <><Check size={15} /> Importer {parsed.rows.length} opérations</>
              : 'Importer'}
        </button>
      </div>
    </Modal>
  );
}
