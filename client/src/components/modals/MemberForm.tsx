import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import type { Member } from '../../api/client';

interface Props {
  member?: Member; // undefined = création
  isPending?: boolean;
  onClose: () => void;
  onSave: (data: { nom: string; couleur: string; initiales: string }) => void;
}

const PRESET_COLORS = [
  { label: 'Bleu',     value: 'q' },
  { label: 'Prune',    value: 'a' },
  { label: 'Vert',     value: 'c' },
  { label: 'Orange',   value: 'd' },
  { label: 'Rouge',    value: 'e' },
  { label: 'Violet',   value: 'f' },
  { label: 'Ocre',     value: 'g' },
  { label: 'Cyan',     value: 'h' },
];

export function MemberFormModal({ member, isPending, onClose, onSave }: Props) {
  const isEdit = !!member;
  const [nom, setNom] = useState(member?.nom ?? '');
  const [couleur, setCouleur] = useState(member?.couleur ?? 'q');

  // Recalcule les initiales depuis le nom saisi (2 premières lettres maj)
  const initiales = nom.trim().slice(0, 2).toUpperCase() || (isEdit ? member!.initiales : '?');
  const valid = !!nom.trim() && (!isEdit || nom.trim() !== member!.nom || couleur !== member!.couleur);

  return (
    <Modal title={isEdit ? 'Modifier le membre' : 'Nouveau membre'} onClose={onClose}>
      <div className="modal-body">
        {/* Aperçu avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: `var(--m-${couleur})`,
            display: 'grid', placeItems: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
            transition: 'background 0.15s',
          }}>
            {initiales}
          </div>
        </div>

        <div className="field-label">Prénom</div>
        <input
          className="input field"
          placeholder="Ex. Marc"
          value={nom}
          onChange={e => setNom(e.target.value)}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && valid && !isPending) onSave({ nom: nom.trim(), couleur, initiales }); }}
        />

        <div className="field-label" style={{ marginTop: 12 }}>Couleur</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {PRESET_COLORS.map(c => (
            <button key={c.value} onClick={() => setCouleur(c.value)} title={c.label}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `var(--m-${c.value})`,
                border: couleur === c.value ? '3px solid var(--text)' : '3px solid transparent',
                cursor: 'pointer', transition: 'border-color 0.1s',
              }} />
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={!!isPending}>Annuler</button>
        <button className="btn primary" disabled={!valid || !!isPending}
          onClick={() => onSave({ nom: nom.trim(), couleur, initiales })}>
          {isPending ? <Loader2 size={15} className="spin" /> : (isEdit ? 'Enregistrer' : 'Ajouter')}
        </button>
      </div>
    </Modal>
  );
}
