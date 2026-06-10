import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import type { Account } from '../../api/client';

interface Props {
  account: Account;
  isPending?: boolean;
  onClose: () => void;
  onSave: (data: { nom: string; type: 'courant' | 'epargne' | 'autre'; banque: string | null }) => void;
}

export function AccountEditModal({ account, isPending, onClose, onSave }: Props) {
  const [nom, setNom] = useState(account.nom);
  const [type, setType] = useState<'courant' | 'epargne' | 'autre'>(account.type);
  const [banque, setBanque] = useState(account.banque ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const hasChanged =
    nom.trim() !== account.nom ||
    type !== account.type ||
    (banque.trim() || null) !== account.banque;

  const valid = !!nom.trim() && hasChanged;

  return (
    <Modal title="Modifier le compte" onClose={onClose}>
      <div className="modal-body">
        <div className="field-label">Nom du compte</div>
        <input
          ref={inputRef}
          className="input field"
          value={nom}
          onChange={e => setNom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && valid && !isPending) onSave({ nom: nom.trim(), type, banque: banque.trim() || null }); }}
        />
        <div className="field-label" style={{ marginTop: 12 }}>Type</div>
        <select
          className="selectx field"
          value={type}
          onChange={e => setType(e.target.value as 'courant' | 'epargne' | 'autre')}
        >
          <option value="courant">Courant</option>
          <option value="epargne">Épargne</option>
          <option value="autre">Autre</option>
        </select>
        <div className="field-label" style={{ marginTop: 12 }}>
          Banque <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span>
        </div>
        <input
          className="input field"
          placeholder="Ex. Crédit Agricole"
          value={banque}
          onChange={e => setBanque(e.target.value)}
        />
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={!!isPending}>Annuler</button>
        <button className="btn primary" disabled={!valid || !!isPending}
          onClick={() => onSave({ nom: nom.trim(), type, banque: banque.trim() || null })}>
          {isPending ? <Loader2 size={15} className="spin" /> : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}
