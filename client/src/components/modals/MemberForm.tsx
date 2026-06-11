import { useRef, useState } from 'react';
import { Loader2, Trash2, User, Smile, Upload } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Avatar } from '../ui/Avatar';
import { useUploadMemberAvatar, useDeleteMemberAvatar } from '../../hooks/useData';
import type { Member } from '../../api/client';

interface Props {
  member?: Member; // undefined = création
  isPending?: boolean;
  onClose: () => void;
  onSave: (data: { nom: string; couleur: string; initiales: string; avatarIcon?: string | null }, photoFile?: File | null) => void;
  onDelete?: () => void;
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

const PRESET_ICONS = [
  'User', 'Smile', 'Heart', 'Star', 'Cat', 'Dog', 'Baby', 'Briefcase',
  'GraduationCap', 'Bike', 'Car', 'Plane', 'Music', 'Gamepad2', 'Book',
  'Coffee', 'Flower2', 'Palette', 'Dumbbell', 'Camera',
];

export function MemberFormModal({ member, isPending, onClose, onSave, onDelete }: Props) {
  const isEdit = !!member;
  const [nom, setNom] = useState(member?.nom ?? '');
  const [couleur, setCouleur] = useState(member?.couleur ?? 'q');
  const [avatarIcon, setAvatarIcon] = useState<string | null>(member?.avatarIcon ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [mode, setMode] = useState<'initiales' | 'icone' | 'photo'>(
    member?.avatarPhoto ? 'photo' : member?.avatarIcon ? 'icone' : 'initiales'
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadMemberAvatar();
  const deleteAvatar = useDeleteMemberAvatar();

  // Recalcule les initiales depuis le nom saisi (2 premières lettres maj)
  const initiales = nom.trim().slice(0, 2).toUpperCase() || (isEdit ? member!.initiales : '?');
  const valid = !!nom.trim() && (!isEdit || nom.trim() !== member!.nom || couleur !== member!.couleur || avatarIcon !== (member!.avatarIcon ?? null) || !!photoFile);

  const previewMember = { couleur, initiales, avatarIcon, avatarPhoto: member?.avatarPhoto ?? null };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    if (member?.avatarPhoto) deleteAvatar.mutate(member.id);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarIcon(null);
    if (isEdit && member) {
      uploadAvatar.mutate({ id: member.id, file });
    } else {
      setPhotoFile(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleSelectIcon = (name: string) => {
    setAvatarIcon(name);
  };

  const handleSetMode = (m: 'initiales' | 'icone' | 'photo') => {
    setMode(m);
    if (m === 'initiales') {
      setAvatarIcon(null);
      clearPhoto();
    } else if (m === 'icone') {
      clearPhoto();
      if (!avatarIcon) setAvatarIcon('User');
    } else {
      setAvatarIcon(null);
      fileRef.current?.click();
    }
  };

  return (
    <Modal title={isEdit ? 'Modifier le membre' : 'Nouveau membre'} onClose={onClose}>
      <div className="modal-body">
        {/* Aperçu avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {photoPreviewUrl ? (
            <span className="avatar" style={{ width: 52, height: 52 }}><img src={photoPreviewUrl} alt="" /></span>
          ) : (
            <Avatar member={previewMember} size={52} />
          )}
        </div>

        <div className="field-label">Prénom</div>
        <input
          className="input field"
          placeholder="Ex. Marc"
          value={nom}
          onChange={e => setNom(e.target.value)}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && valid && !isPending) onSave({ nom: nom.trim(), couleur, initiales, avatarIcon }, photoFile); }}
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

        <div className="field-label" style={{ marginTop: 12 }}>Avatar</div>
        <div className="export-period-grid avatar-mode-grid">
          <button type="button" className={`export-period-chip${mode === 'initiales' ? ' on' : ''}`}
            onClick={() => handleSetMode('initiales')}>
            <User size={14} /> Initiales
          </button>
          <button type="button" className={`export-period-chip${mode === 'icone' ? ' on' : ''}`}
            onClick={() => handleSetMode('icone')}>
            <Smile size={14} /> Icône
          </button>
          <button type="button" className={`export-period-chip${mode === 'photo' ? ' on' : ''}`}
            onClick={() => handleSetMode('photo')} disabled={uploadAvatar.isPending}>
            {uploadAvatar.isPending ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        </div>

        {mode === 'icone' && (
          <div className="tv-cat-grid">
            {PRESET_ICONS.map(name => {
              const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
              return (
                <button key={name} type="button" className={`tv-cat-chip${avatarIcon === name ? ' on' : ''}`}
                  onClick={() => handleSelectIcon(name)}>
                  <span className="tv-cat-ic"><Icon size={16} /></span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="modal-foot" style={{ flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn ghost" onClick={onClose} disabled={!!isPending}>Annuler</button>
          <button className="btn primary" style={{ flex: 1 }} disabled={!valid || !!isPending}
            onClick={() => onSave({ nom: nom.trim(), couleur, initiales, avatarIcon }, photoFile)}>
            {isPending ? <Loader2 size={15} className="spin" /> : (isEdit ? 'Enregistrer' : 'Ajouter')}
          </button>
        </div>
        {isEdit && onDelete && (
          confirmDel ? (
            <button className="btn danger" style={{ width: '100%', background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }}
              disabled={!!isPending} onClick={onDelete}>
              {isPending ? <Loader2 size={15} className="spin" /> : <><Trash2 size={15} /> Confirmer la suppression</>}
            </button>
          ) : (
            <button className="btn danger" style={{ width: '100%' }} disabled={!!isPending}
              onClick={() => setConfirmDel(true)}>
              <Trash2 size={15} /> Supprimer le membre
            </button>
          )
        )}
      </div>
    </Modal>
  );
}
