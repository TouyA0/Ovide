import { useState } from 'react';
import { Modal } from './Modal';

interface Props {
  onClose: () => void;
  onSave: (data: { nom: string; couleur: string; initiales: string }) => void;
}

const PRESET_COLORS = [
  { label: 'Bleu', value: 'q' },
  { label: 'Prune', value: 'a' },
  { label: 'Vert', value: 'c' },
];

export function MemberFormModal({ onClose, onSave }: Props) {
  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState('q');
  const initiales = nom.trim().slice(0, 2).toUpperCase() || '?';
  const valid = !!nom.trim();

  return (
    <Modal title="Nouveau membre" onClose={onClose}>
      <div className="modal-body">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `var(--m-${couleur})`, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {initiales}
          </div>
        </div>

        <div className="field-label">Prénom</div>
        <input className="input field" placeholder="Ex. Marc" value={nom} onChange={e => setNom(e.target.value)} autoFocus />

        <div className="field-label" style={{ marginTop: 12 }}>Couleur</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {PRESET_COLORS.map(c => (
            <button key={c.value} onClick={() => setCouleur(c.value)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: `var(--m-${c.value})`, border: couleur === c.value ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }}
              title={c.label} />
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!valid}
          onClick={() => onSave({ nom: nom.trim(), couleur, initiales })}>
          Ajouter
        </button>
      </div>
    </Modal>
  );
}
