import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Modal } from './Modal';
import type { Transaction, Category, Account, Member } from '../../api/client';

interface Props {
  tx: Transaction;
  categories: Category[];
  accounts: Account[];
  members: Member[];
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

const INCOME_CATS = ['c_salaire', 'c_revenus', 'c_divers'];

export function EditTransactionModal({ tx, categories, accounts: _accounts, members: _members, onClose, onSave, onDelete }: Props) {
  const isTransfer = tx.type === 'transfer';
  const [amount, setAmount] = useState(String(tx.montant).replace('.', ','));
  const [catId, setCatId] = useState<string | null>(tx.categorieId);
  const [libelle, setLibelle] = useState(tx.libelle);
  const [date, setDate] = useState(tx.date);
  const [type, setType] = useState<'expense' | 'income'>(tx.type === 'transfer' ? 'expense' : tx.type);
  const [confirmDel, setConfirmDel] = useState(false);

  const shownCats = type === 'income' ? categories.filter(c => INCOME_CATS.includes(c.id)) : categories.filter(c => !['c_salaire', 'c_revenus'].includes(c.id));
  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = parsed > 0;

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

        {!isTransfer && (
          <>
            <div className="field-label">Catégorie</div>
            <div className="chip-grid">
              {shownCats.map(c => {
                const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
                  c.icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
                ];
                return (
                  <button key={c.id} className={`chip${catId === c.id ? ' on' : ''}`} onClick={() => setCatId(c.id)}>
                    <span className="c-ic" style={{ background: catId === c.id ? `oklch(0.6 0.12 ${c.hue})` : `oklch(0.6 0.12 ${c.hue} / 0.14)`, color: catId === c.id ? '#fff' : `oklch(0.5 0.13 ${c.hue})` }}>
                      {IconComp ? <IconComp size={14} /> : null}
                    </span>
                    <span className="chip-name">{c.nom}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="field-label">Détails</div>
        <div className="field"><input className="input" placeholder="Libellé" value={libelle} onChange={e => setLibelle(e.target.value)} /></div>
        <div className="field" style={{ marginTop: 10 }}><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>
      <div className="modal-foot" style={{ flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn ghost" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
          <button className="btn primary" disabled={!valid} style={{ flex: 1 }}
            onClick={() => onSave({ ...tx, type: isTransfer ? tx.type : type, montant: Math.abs(parsed), categorieId: catId, libelle: libelle.trim(), date })}>
            Enregistrer
          </button>
        </div>
        {!confirmDel ? (
          <button className="btn danger" style={{ width: '100%' }} onClick={() => setConfirmDel(true)}>
            <Trash2 size={15} /> Supprimer
          </button>
        ) : (
          <button className="btn danger" style={{ width: '100%', background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }} onClick={() => onDelete(tx)}>
            <Trash2 size={15} /> Confirmer la suppression{isTransfer ? ' (2 écritures)' : ''}
          </button>
        )}
      </div>
    </Modal>
  );
}
