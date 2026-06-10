import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { CategoryPicker } from '../ui/CategoryPicker';
import { today } from '../../utils/format';
import type { Account, Member, Category } from '../../api/client';

interface Props {
  accounts: Account[];
  members: Member[];
  categories: Category[];
  defaultAccountId: string;
  isPending?: boolean;
  onClose: () => void;
  onSave: (data: {
    accountId: string; type: 'expense' | 'income';
    montant: number; categorieId: string; libelle: string; date: string; note: string;
  }) => void;
}

export function AddTransactionModal({ accounts, members, categories, defaultAccountId, isPending, onClose, onSave }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState<string | null>(null);
  const [libelle, setLibelle] = useState('');
  const [date, setDate] = useState(today());
  const [accId, setAccId] = useState(defaultAccountId || accounts[0]?.id);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => amountRef.current?.focus(), 80); return () => clearTimeout(t); }, []);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const valid = parsedAmount > 0 && !!catId;

  const submit = () => {
    if (!valid || !catId) return;
    onSave({ accountId: accId, type, montant: Math.abs(parsedAmount), categorieId: catId, libelle: libelle.trim(), date, note: '' });
  };

  const onAmountKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); (document.getElementById('cat-grid') as HTMLElement)?.querySelector('button')?.focus(); }
  };

  return (
    <Modal title="Nouvelle opération" onClose={onClose}>
      <div className="modal-body">
        <div className="type-toggle">
          <button className={`type-opt exp${type === 'expense' ? ' on' : ''}`} onClick={() => setType('expense')}>
            <span className="t-ic" style={{ background: type === 'expense' ? 'var(--neg)' : 'var(--surface-2)', color: type === 'expense' ? '#fff' : 'var(--text-3)' }}><Minus size={17} strokeWidth={2.6} /></span>
            Dépense
          </button>
          <button className={`type-opt inc${type === 'income' ? ' on' : ''}`} onClick={() => { setType('income'); if (!INCOME_CATS.includes(catId ?? '')) setCatId(null); }}>
            <span className="t-ic" style={{ background: type === 'income' ? 'var(--pos)' : 'var(--surface-2)', color: type === 'income' ? '#fff' : 'var(--text-3)' }}><Plus size={17} strokeWidth={2.6} /></span>
            Entrée
          </button>
        </div>

        <div className="amount-field">
          <input ref={amountRef} className={`amount-input ${type}`} inputMode="decimal" placeholder="0,00"
            value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} onKeyDown={onAmountKey} aria-label="Montant" />
          <span className="cur">€</span>
        </div>

        <div className="field-label">Catégorie</div>
        <CategoryPicker categories={categories} selected={catId} onChange={setCatId} filter={type} />

        <div className="field-label">Détails</div>
        <div className="field">
          <input className="input" placeholder="Libellé (optionnel)" value={libelle} onChange={e => setLibelle(e.target.value)} />
        </div>
        <div className="row2" style={{ marginTop: 10 }}>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date" />
          <select className="selectx" value={accId} onChange={e => setAccId(e.target.value)} aria-label="Compte">
            {members.map(m => (
              <optgroup key={m.id} label={m.nom}>
                {accounts.filter(a => a.memberId === m.id).map(a => (
                  <option key={a.id} value={a.id}>{m.nom} · {a.nom}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!valid || !!isPending} onClick={submit}>
          {isPending ? <Loader2 size={15} className="spin" /> : <>Ajouter {valid ? (type === 'expense' ? '−' : '+') + parsedAmount.toFixed(2).replace('.', ',') + ' €' : ''}</>}
        </button>
      </div>
    </Modal>
  );
}
