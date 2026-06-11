import { useEffect, useState } from 'react';
import { Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../../api/client';
import { exportMonthlyPDF } from '../../utils/pdf';
import { MONTHS_FULL } from '../../utils/format';
import type { Account, Member, Category, Transaction } from '../../api/client';

interface Props {
  account: Account;
  member: Member;
  categories: Category[];
  onClose: () => void;
  onExportCsv: () => void;
  onDone: (msg: string) => void;
}

export function ExportModal({ account, member, categories, onClose, onExportCsv, onDone }: Props) {
  const [format, setFormat] = useState<'csv' | 'pdf'>('pdf');
  const [period, setPeriod] = useState<string>('all');
  const [months, setMonths] = useState<string[]>([]);
  const [txs, setTxs] = useState<Transaction[] | null>(null);

  useEffect(() => {
    api.getTransactions(account.id).then(data => {
      setTxs(data);
      const set = new Set(data.filter(t => t.accountId === account.id).map(t => t.date.slice(0, 7)));
      const sorted = [...set].sort().reverse();
      setMonths(sorted);
      setPeriod(sorted[0] ?? 'all');
    });
  }, [account.id]);

  const handleConfirm = () => {
    if (format === 'csv') {
      onExportCsv();
      onClose();
      return;
    }
    if (!txs) return;
    exportMonthlyPDF(account, member, categories, txs, period === 'all' ? null : period);
    onDone('Rapport PDF telecharge');
    onClose();
  };

  const loading = txs === null;

  return (
    <Modal title="Exporter" onClose={onClose}>
      <div className="modal-body">
        <div className="field-label">Format</div>
        <div className="type-toggle">
          <button className={`type-opt${format === 'csv' ? ' on' : ''}`} onClick={() => setFormat('csv')}>
            <span className="t-ic" style={{ background: format === 'csv' ? 'var(--accent)' : 'var(--surface-2)', color: format === 'csv' ? '#fff' : 'var(--text-3)' }}>
              <FileSpreadsheet size={17} />
            </span>
            CSV
          </button>
          <button className={`type-opt${format === 'pdf' ? ' on' : ''}`} onClick={() => setFormat('pdf')}>
            <span className="t-ic" style={{ background: format === 'pdf' ? 'var(--accent)' : 'var(--surface-2)', color: format === 'pdf' ? '#fff' : 'var(--text-3)' }}>
              <FileText size={17} />
            </span>
            PDF
          </button>
        </div>

        {format === 'pdf' && (
          <>
            <div className="field-label" style={{ marginTop: 14 }}>Periode</div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <Loader2 size={18} className="spin" style={{ color: 'var(--text-3)' }} />
              </div>
            ) : (
              <div className="export-period-grid">
                <button className={`export-period-chip${period === 'all' ? ' on' : ''}`} onClick={() => setPeriod('all')}>
                  Tout
                </button>
                {months.map(m => {
                  const [y, mo] = m.split('-').map(Number);
                  return (
                    <button key={m} className={`export-period-chip${period === m ? ' on' : ''}`} onClick={() => setPeriod(m)}>
                      {MONTHS_FULL[mo - 1]} {y}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={loading} onClick={handleConfirm}>
          Exporter
        </button>
      </div>
    </Modal>
  );
}
