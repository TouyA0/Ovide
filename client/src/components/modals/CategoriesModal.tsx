import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, ArrowLeft } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { ComponentType } from 'react';
import { Modal } from './Modal';
import type { Category } from '../../api/client';

interface Props {
  categories: Category[];
  onClose: () => void;
  onCreate: (data: Partial<Category>) => void;
  onUpdate: (id: string, data: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

type ViewMode = 'list' | 'edit';

const ICON_SUGGESTIONS = [
  'shopping-cart', 'utensils', 'car', 'house', 'zap', 'heart-pulse',
  'shirt', 'plane', 'graduation-cap', 'gamepad-2', 'music', 'dumbbell',
  'coffee', 'gift', 'wrench', 'baby', 'dog', 'leaf',
  'briefcase', 'wallet', 'piggy-bank', 'receipt', 'trending-up', 'handshake',
];

function iconNameToComponent(name: string): ComponentType<{ size?: number }> | null {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  return (LucideIcons as unknown as Record<string, ComponentType<{ size?: number }>>)[pascal] ?? null;
}

function CategoryIcon({ name, hue, size = 22 }: { name: string; hue: number; size?: number }) {
  const Comp = iconNameToComponent(name);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 10, height: size + 10, borderRadius: 8,
      background: `oklch(0.6 0.12 ${hue} / 0.15)`,
      color: `oklch(0.5 0.13 ${hue})`,
      flexShrink: 0,
    }}>
      {Comp ? <Comp size={size} /> : <span style={{ fontSize: 10, color: 'var(--text-3)' }}>?</span>}
    </span>
  );
}

export function CategoriesModal({ categories, onClose, onCreate, onUpdate, onDelete }: Props) {
  const [view, setView] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<Category | null>(null); // null = new

  // Form state
  const [nom, setNom] = useState('');
  const [icone, setIcone] = useState('tag');
  const [hue, setHue] = useState(220);
  const [confirmDel, setConfirmDel] = useState(false);

  const nomRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditing(null);
    setNom('');
    setIcone('tag');
    setHue(220);
    setConfirmDel(false);
    setView('edit');
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setNom(cat.nom);
    setIcone(cat.icone);
    setHue(cat.hue);
    setConfirmDel(false);
    setView('edit');
  };

  const backToList = () => { setView('list'); setEditing(null); setConfirmDel(false); };

  useEffect(() => {
    if (view === 'edit') setTimeout(() => nomRef.current?.select(), 30);
  }, [view]);

  const valid = nom.trim().length > 0 && iconNameToComponent(icone) !== null;

  const handleSave = () => {
    if (!valid) return;
    const data = { nom: nom.trim(), icone: icone.trim(), hue };
    if (editing) onUpdate(editing.id, data);
    else onCreate(data);
    backToList();
  };

  const handleDelete = () => {
    if (!editing) return;
    onDelete(editing.id);
    backToList();
  };

  // ── List view ───────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <Modal title="Catégories" onClose={onClose}>
        <div className="modal-body" style={{ padding: 0 }}>
          {categories.length === 0 ? (
            <p style={{ padding: '20px 24px', color: 'var(--text-3)', fontSize: 14 }}>
              Aucune catégorie. Créez-en une !
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '8px 0' }}>
              {categories.map(cat => (
                <li key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 20px', cursor: 'default',
                  transition: 'background 0.1s',
                }}>
                  <CategoryIcon name={cat.icone} hue={cat.hue} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.nom}</span>
                  <button
                    className="btn ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil size={13} /> Modifier
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Fermer</button>
          <button className="btn primary" onClick={openNew}>
            <Plus size={15} /> Nouvelle catégorie
          </button>
        </div>
      </Modal>
    );
  }

  // ── Edit / Create view ──────────────────────────────────────────
  const IconComp = iconNameToComponent(icone);

  return (
    <Modal title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={onClose}>
      <div className="modal-body">

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <CategoryIcon name={icone} hue={hue} size={26} />
          <span style={{ fontSize: 16, fontWeight: 600, color: nom.trim() ? 'var(--text-1)' : 'var(--text-3)' }}>
            {nom.trim() || 'Nouvelle catégorie'}
          </span>
        </div>

        {/* Nom */}
        <div className="field-label">Nom</div>
        <input
          ref={nomRef}
          className="input field"
          placeholder="Ex. Alimentation, Transport…"
          value={nom}
          onChange={e => setNom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        />

        {/* Icône */}
        <div className="field-label" style={{ marginTop: 14 }}>
          Icône
          {!IconComp && icone.length > 0 && (
            <span style={{ color: 'var(--neg)', marginLeft: 8, fontSize: 12, fontWeight: 400 }}>
              Nom introuvable
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="kebab-case, ex: shopping-cart"
            value={icone}
            onChange={e => setIcone(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          />
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: `oklch(0.6 0.12 ${hue} / 0.15)`,
            color: `oklch(0.5 0.13 ${hue})`,
            border: '1px solid var(--line)',
          }}>
            {IconComp ? <IconComp size={18} /> : <X size={16} style={{ color: 'var(--text-3)' }} />}
          </span>
        </div>

        {/* Suggestions rapides */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
          {ICON_SUGGESTIONS.map(name => {
            const Ic = iconNameToComponent(name);
            if (!Ic) return null;
            return (
              <button
                key={name}
                title={name}
                onClick={() => setIcone(name)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: icone === name ? `oklch(0.6 0.12 ${hue} / 0.2)` : 'var(--surface-2)',
                  color: icone === name ? `oklch(0.5 0.13 ${hue})` : 'var(--text-2)',
                  outline: icone === name ? `2px solid oklch(0.6 0.12 ${hue})` : 'none',
                  transition: 'background 0.1s',
                }}
              >
                <Ic size={15} />
              </button>
            );
          })}
        </div>

        {/* Couleur */}
        <div className="field-label" style={{ marginTop: 14 }}>Couleur</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range" min={0} max={359} value={hue}
            onChange={e => setHue(Number(e.target.value))}
            style={{ flex: 1, accentColor: `oklch(0.6 0.15 ${hue})` }}
          />
          <span style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: `oklch(0.6 0.15 ${hue})`,
            display: 'inline-block',
          }} />
        </div>
      </div>

      <div className="modal-foot" style={{ flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn ghost" onClick={backToList} style={{ gap: 6 }}>
            <ArrowLeft size={14} /> Retour
          </button>
          <button className="btn primary" disabled={!valid} style={{ flex: 1 }} onClick={handleSave}>
            <Check size={15} /> {editing ? 'Enregistrer' : 'Créer'}
          </button>
        </div>

        {editing && (
          confirmDel ? (
            <button
              className="btn danger"
              style={{ width: '100%', background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }}
              onClick={handleDelete}
            >
              <Trash2 size={15} /> Confirmer la suppression
            </button>
          ) : (
            <button className="btn danger" style={{ width: '100%' }} onClick={() => setConfirmDel(true)}>
              <Trash2 size={15} /> Supprimer
            </button>
          )
        )}
      </div>
    </Modal>
  );
}
