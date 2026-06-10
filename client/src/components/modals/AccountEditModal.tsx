import { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import type { Account } from '../../api/client';

interface Props {
  account: Account;
  onClose: () => void;
  onSave: (data: { nom: string; type: 'courant' | 'epargne' | 'autre' }) => void;
}

export function AccountEditModal({ account, onClose, onSave }: Props) {
  const [nom, setNom] = useState(account.nom);
  const [type, setType] = useState<'courant' | 'epargne' | 'autre'>(account.type);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const valid = !!nom.trim() && nom.trim() !== account.nom || type !== account.type;

  return (
    <Modal title="Modifier le compte" onClose={onClose}>
      <div className="modal-body">
        <div className="field-label">Nom du compte</div>
        <input
          ref={inputRef}
          className="input field"
          value={nom}
          onChange={e => setNom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && valid) onSave({ nom: nom.trim(), type }); }}
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
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!valid}
          onClick={() => onSave({ nom: nom.trim(), type })}>
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}
