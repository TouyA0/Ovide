import { useState } from 'react';
import { Modal } from './Modal';
import type { Member } from '../../api/client';

interface Props {
  members: Member[];
  defaultMemberId?: string;
  onClose: () => void;
  onSave: (data: { memberId: string; nom: string; type: 'courant' | 'epargne' | 'autre'; banque: string | null; soldeInitial: number }) => void;
}

export function AccountFormModal({ members, defaultMemberId, onClose, onSave }: Props) {
  const [memberId, setMemberId] = useState(defaultMemberId ?? members[0]?.id ?? '');
  const [nom, setNom] = useState('');
  const [type, setType] = useState<'courant' | 'epargne' | 'autre'>('courant');
  const [banque, setBanque] = useState('');
  const [solde, setSolde] = useState('');

  const valid = !!nom.trim() && !!memberId;

  return (
    <Modal title="Nouveau compte" onClose={onClose}>
      <div className="modal-body">
        <div className="field-label">Membre</div>
        <select className="selectx field" value={memberId} onChange={e => setMemberId(e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>

        <div className="field-label">Nom du compte</div>
        <input className="input field" placeholder="Ex. Compte courant" value={nom} onChange={e => setNom(e.target.value)} />

        <div className="field-label" style={{ marginTop: 12 }}>Type</div>
        <select className="selectx field" value={type} onChange={e => setType(e.target.value as 'courant' | 'epargne' | 'autre')}>
          <option value="courant">Courant</option>
          <option value="epargne">Épargne</option>
          <option value="autre">Autre</option>
        </select>

        <div className="field-label" style={{ marginTop: 12 }}>Banque <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optionnel)</span></div>
        <input className="input field" placeholder="Ex. Crédit Agricole" value={banque} onChange={e => setBanque(e.target.value)} />

        <div className="field-label" style={{ marginTop: 12 }}>Solde initial (solde actuel réel)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="input" inputMode="decimal" placeholder="0,00" value={solde}
            onChange={e => setSolde(e.target.value.replace(/[^0-9.,-]/g, ''))} style={{ flex: 1 }} />
          <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>€</span>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!valid}
          onClick={() => onSave({ memberId, nom: nom.trim(), type, banque: banque.trim() || null, soldeInitial: parseFloat(solde.replace(',', '.')) || 0 })}>
          Créer le compte
        </button>
      </div>
    </Modal>
  );
}
