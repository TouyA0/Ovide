import { useRef, useState } from 'react';
import { Minus, Plus, Trash2, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { Modal } from './Modal';
import { CategoryPicker } from '../ui/CategoryPicker';
import { useUploadReceipt, useDeleteReceipt } from '../../hooks/useData';
import type { Transaction, Category, Account, Member } from '../../api/client';

interface Props {
  tx: Transaction;
  categories: Category[];
  accounts: Account[];
  members: Member[];
  isPending?: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

/* ── Section pièce jointe ── */
function ReceiptSection({ txId, initialPath }: { txId: string; initialPath: string | null }) {
  const [receiptPath, setReceiptPath] = useState(initialPath);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadReceipt();
  const deleteMut = useDeleteReceipt();

  const isImage = receiptPath && /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(receiptPath);
  const isPdf = receiptPath && /\.pdf$/i.test(receiptPath);
  const receiptUrl = receiptPath ? `/api/receipts/${receiptPath}` : null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const { receiptPath: newPath } = await uploadMut.mutateAsync({ txId, file });
    setReceiptPath(newPath);
    setConfirmDel(false);
  };

  const handleDelete = async () => {
    await deleteMut.mutateAsync(txId);
    setReceiptPath(null);
    setConfirmDel(false);
  };

  const busy = uploadMut.isPending || deleteMut.isPending;

  return (
    <div style={{ marginTop: 14 }}>
      <div className="field-label">Pièce jointe</div>

      {!receiptPath ? (
        <>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
          <button
            className="btn ghost receipt-upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 size={14} className="spin" /> : <Paperclip size={14} />}
            {busy ? 'Envoi…' : 'Attacher un reçu'}
          </button>
        </>
      ) : (
        <div className="receipt-preview">
          {isImage && receiptUrl ? (
            <a href={receiptUrl} target="_blank" rel="noreferrer" className="receipt-thumb-link" title="Ouvrir en plein écran">
              <img src={receiptUrl} alt="Reçu" className="receipt-thumb" />
            </a>
          ) : (
            <a href={receiptUrl!} target="_blank" rel="noreferrer" className="receipt-file-link">
              <FileText size={20} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <span>Reçu{receiptPath.includes('.') ? '.' + receiptPath.split('.').pop()!.toLowerCase() : ''}</span>
            </a>
          )}
          <div className="receipt-actions">
            {isPdf || !isImage ? null : null}
            {confirmDel ? (
              <button className="btn danger sm" disabled={busy}
                onClick={handleDelete}
                style={{ background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }}>
                {busy ? <Loader2 size={13} className="spin" /> : <><Trash2 size={13} /> Confirmer</>}
              </button>
            ) : (
              <button className="btn ghost sm" disabled={busy} onClick={() => setConfirmDel(true)}>
                <X size={13} /> Supprimer
              </button>
            )}
            <>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
              <button className="btn ghost sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Paperclip size={13} /> Remplacer
              </button>
            </>
          </div>
        </div>
      )}
    </div>
  );
}

export function EditTransactionModal({ tx, categories, accounts: _accounts, members: _members, isPending, onClose, onSave, onDelete }: Props) {
  const isTransfer = tx.type === 'transfer';
  const [amount, setAmount] = useState(String(tx.montant).replace('.', ','));
  const [catId, setCatId] = useState<string | null>(tx.categorieId);
  const [libelle, setLibelle] = useState(tx.libelle);
  const [date, setDate] = useState(tx.date);
  const [type, setType] = useState<'expense' | 'income'>(tx.type === 'transfer' ? 'expense' : tx.type);
  const [note, setNote] = useState(tx.note ?? '');
  const [confirmDel, setConfirmDel] = useState(false);

  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = parsed > 0 && !!libelle.trim();

  return (
    <Modal title={isTransfer ? 'Virement' : "Modifier l'opération"} onClose={onClose}>
      <div className="modal-body">
        {!isTransfer && (
          <div className="type-toggle">
            <button className={`type-opt exp${type === 'expense' ? ' on' : ''}`} onClick={() => setType('expense')}>
              <span className="t-ic" style={{ background: type === 'expense' ? 'var(--neg)' : 'var(--surface-2)', color: type === 'expense' ? '#fff' : 'var(--text-3)' }}><Minus size={17} strokeWidth={2.6} /></span>Dépense
            </button>
            <button className={`type-opt inc${type === 'income' ? ' on' : ''}`} onClick={() => setType('income')}>
              <span className="t-ic" style={{ background: type === 'income' ? 'var(--pos)' : 'var(--surface-2)', color: type === 'income' ? '#fff' : 'var(--text-3)' }}><Plus size={17} strokeWidth={2.6} /></span>Entrée
            </button>
          </div>
        )}
        <div className="amount-field">
          <input className={`amount-input${isTransfer ? '' : ' ' + type}`} inputMode="decimal" value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} aria-label="Montant" />
          <span className="cur">€</span>
        </div>
        {isTransfer && <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: -6 }}>Modifier le montant ajuste les deux écritures liées.</p>}

        <div className="field-label">Catégorie</div>
        <CategoryPicker
          categories={categories}
          selected={catId}
          onChange={setCatId}
          filter={isTransfer ? 'all' : type}
        />

        <div className="field-label">Détails</div>
        <div className="field"><input className="input" placeholder="Libellé" value={libelle} onChange={e => setLibelle(e.target.value)} /></div>
        <div className="field" style={{ marginTop: 10 }}><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field" style={{ marginTop: 10 }}>
          <textarea className="input" placeholder="Commentaire (optionnel)" value={note} onChange={e => setNote(e.target.value)}
            rows={2} style={{ resize: 'none', lineHeight: 1.5 }} />
        </div>

        <ReceiptSection txId={tx.id} initialPath={tx.receiptPath ?? null} />
      </div>
      <div className="modal-foot" style={{ flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn ghost" onClick={onClose} style={{ flex: 1 }} disabled={!!isPending}>Annuler</button>
          <button className="btn primary" disabled={!valid || !!isPending} style={{ flex: 1 }}
            onClick={() => onSave({ ...tx, type: isTransfer ? tx.type : type, montant: Math.abs(parsed), categorieId: catId, libelle: libelle.trim(), date, note: note.trim() })}>
            {isPending ? <Loader2 size={15} className="spin" /> : 'Enregistrer'}
          </button>
        </div>
        {!confirmDel ? (
          <button className="btn danger" style={{ width: '100%' }} disabled={!!isPending} onClick={() => setConfirmDel(true)}>
            <Trash2 size={15} /> Supprimer
          </button>
        ) : (
          <button className="btn danger" style={{ width: '100%', background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }} disabled={!!isPending} onClick={() => onDelete(tx)}>
            {isPending ? <Loader2 size={15} className="spin" /> : <><Trash2 size={15} /> Confirmer la suppression{isTransfer ? ' (2 écritures)' : ''}</>}
          </button>
        )}
      </div>
    </Modal>
  );
}
