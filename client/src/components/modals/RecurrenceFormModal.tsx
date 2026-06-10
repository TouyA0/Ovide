import { useState } from 'react';
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { CategoryPicker } from '../ui/CategoryPicker';
import type { Recurrence, Category } from '../../api/client';

interface Props {
  recurrence?: Recurrence; // undefined = création
  accountId: string;
  categories: Category[];
  isPending?: boolean;
  onClose: () => void;
  onCreate: (data: Omit<Recurrence, 'id'>) => void;
  onUpdate: (id: string, data: Omit<Recurrence, 'id'>) => void;
  onDelete: (id: string) => void;
}

export function RecurrenceFormModal({ recurrence, accountId, categories, isPending, onClose, onCreate, onUpdate, onDelete }: Props) {
  const isEdit = !!recurrence;

  const [sens, setSens] = useState<'income' | 'expense'>(recurrence?.sens ?? 'expense');
  const [amount, setAmount] = useState(recurrence ? String(recurrence.montant).replace('.', ',') : '');
  const [catId, setCatId] = useState<string | null>(recurrence?.categorieId ?? null);
  const [libelle, setLibelle] = useState(recurrence?.libelle ?? '');
  const [note, setNote] = useState(recurrence?.note ?? '');
  const [jour, setJour] = useState(String(recurrence?.jourDuMois ?? ''));
  const [confirmDel, setConfirmDel] = useState(false);

  const parsed = parseFloat(amount.replace(',', '.'));
  const jourNum = parseInt(jour);
  const valid = parsed > 0 && !!libelle.trim() && jourNum >= 1 && jourNum <= 31;

  const buildData = (): Omit<Recurrence, 'id'> => ({
    accountId,
    montant: Math.abs(parsed),
    sens,
    categorieId: catId,
    jourDuMois: jourNum,
    libelle: libelle.trim(),
    note: note.trim(),
  });

  const handleSave = () => {
    if (!valid) return;
    if (isEdit) onUpdate(recurrence!.id, buildData());
    else onCreate(buildData());
  };

  return (
    <Modal title={isEdit ? 'Modifier la récurrence' : 'Nouvelle récurrence'} onClose={onClose}>
      <div className="modal-body">
        <div className="type-toggle">
          <button className={`type-opt exp${sens === 'expense' ? ' on' : ''}`} onClick={() => { setSens('expense'); setCatId(null); }}>
            <span className="t-ic" style={{ background: sens === 'expense' ? 'var(--neg)' : 'var(--surface-2)', color: sens === 'expense' ? '#fff' : 'var(--text-3)' }}>
              <Minus size={17} strokeWidth={2.6} />
            </span>Dépense
          </button>
          <button className={`type-opt inc${sens === 'income' ? ' on' : ''}`} onClick={() => { setSens('income'); setCatId(null); }}>
            <span className="t-ic" style={{ background: sens === 'income' ? 'var(--pos)' : 'var(--surface-2)', color: sens === 'income' ? '#fff' : 'var(--text-3)' }}>
              <Plus size={17} strokeWidth={2.6} />
            </span>Entrée
          </button>
        </div>

        <div className="amount-field">
          <input className={`amount-input ${sens}`} inputMode="decimal" value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} aria-label="Montant" />
          <span className="cur">€</span>
        </div>

        <div className="field-label">Catégorie</div>
        <CategoryPicker categories={categories} selected={catId} onChange={setCatId} filter={sens} />

        <div className="field-label">Libellé</div>
        <input className="input field" placeholder="Ex. Loyer, Salaire…" value={libelle}
          onChange={e => setLibelle(e.target.value)} />

        <div className="field-label" style={{ marginTop: 12 }}>Note <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnelle)</span></div>
        <textarea className="input field" placeholder="Note…" value={note} onChange={e => setNote(e.target.value)}
          rows={2} style={{ resize: 'none', lineHeight: 1.5 }} />

        <div className="field-label" style={{ marginTop: 12 }}>Jour du mois</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input className="input" type="number" min={1} max={31} placeholder="1–31" value={jour}
            onChange={e => setJour(e.target.value)} style={{ width: 90 }} />
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
            {jourNum >= 1 && jourNum <= 31 ? `Le ${jourNum} de chaque mois` : 'Entre 1 et 31'}
          </span>
        </div>
      </div>

      <div className="modal-foot" style={{ flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn ghost" onClick={onClose} style={{ flex: 1 }} disabled={!!isPending}>Annuler</button>
          <button className="btn primary" disabled={!valid || !!isPending} style={{ flex: 1 }} onClick={handleSave}>
            {isPending ? <Loader2 size={15} className="spin" /> : (isEdit ? 'Enregistrer' : 'Créer')}
          </button>
        </div>
        {isEdit && (
          confirmDel ? (
            <button className="btn danger" style={{ width: '100%', background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }}
              disabled={!!isPending} onClick={() => onDelete(recurrence!.id)}>
              {isPending ? <Loader2 size={15} className="spin" /> : <><Trash2 size={15} /> Confirmer la suppression</>}
            </button>
          ) : (
            <button className="btn danger" style={{ width: '100%' }} disabled={!!isPending} onClick={() => setConfirmDel(true)}>
              <Trash2 size={15} /> Supprimer
            </button>
          )
        )}
      </div>
    </Modal>
  );
}
