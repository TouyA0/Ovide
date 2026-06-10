import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import type { Member } from '../../api/client';

interface Props {
  members: Member[];
  defaultMemberId: string;
  isPending?: boolean;
  onClose: () => void;
  onSave: (data: { memberId: string; nom: string; type: 'courant' | 'epargne' | 'autre'; banque: string | null; soldeInitial: number }) => void;
}

export function AccountFormModal({ members, defaultMemberId, isPending, onClose, onSave }: Props) {
  const member = members.find(m => m.id === defaultMemberId);
  const [nom, setNom] = useState('');
  const [type, setType] = useState<'courant' | 'epargne' | 'autre'>('courant');
  const [banque, setBanque] = useState('');
  const [solde, setSolde] = useState('');

  const valid = !!nom.trim();

  return (
    <Modal title="Nouveau compte" onClose={onClose}>
      <div className="modal-body">
        {member && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
            <i className="account-dot" style={{ background: `var(--m-${member.couleur})`, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{member.nom}</span>
          </div>
        )}

        <div className="field-label">Nom du compte</div>
        <input className="input field" placeholder="Ex. Compte courant" value={nom} onChange={e => setNom(e.target.value)} autoFocus />

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
        <button className="btn ghost" onClick={onClose} disabled={!!isPending}>Annuler</button>
        <button className="btn primary" disabled={!valid || !!isPending}
          onClick={() => onSave({ memberId: defaultMemberId, nom: nom.trim(), type, banque: banque.trim() || null, soldeInitial: parseFloat(solde.replace(',', '.')) || 0 })}>
          {isPending ? <Loader2 size={15} className="spin" /> : 'Créer le compte'}
        </button>
      </div>
    </Modal>
  );
}
