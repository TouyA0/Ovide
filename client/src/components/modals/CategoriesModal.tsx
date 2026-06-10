import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, ArrowLeft, Search, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { ComponentType } from 'react';
import { Modal } from './Modal';
import type { Category } from '../../api/client';

interface Props {
  categories: Category[];
  isPending?: boolean;
  onClose: () => void;
  onCreate: (data: Partial<Category>) => void;
  onUpdate: (id: string, data: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

type ViewMode = 'list' | 'edit';

// ── Icon catalogue ────────────────────────────────────────────────
const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: 'Alimentation',
    icons: [
      'utensils', 'coffee', 'wine', 'pizza', 'apple', 'fish', 'beef',
      'carrot', 'cake', 'beer', 'croissant', 'salad', 'soup', 'sandwich',
      'cookie', 'grape', 'banana', 'egg', 'milk', 'flame',
    ],
  },
  {
    label: 'Transport',
    icons: [
      'car', 'bus', 'train-front', 'plane', 'bike', 'fuel', 'map-pin',
      'navigation', 'truck', 'ship', 'cable-car', 'tram-front',
    ],
  },
  {
    label: 'Maison',
    icons: [
      'house', 'sofa', 'lamp-desk', 'bed-double', 'bath', 'tv',
      'wifi', 'phone', 'wrench', 'hammer', 'paintbrush', 'scissors',
      'plug', 'key', 'thermometer', 'shower-head', 'trash-2', 'door-open',
    ],
  },
  {
    label: 'Shopping',
    icons: [
      'shopping-cart', 'shopping-bag', 'package', 'gift', 'tag',
      'credit-card', 'store', 'receipt', 'shirt', 'glasses', 'watch',
    ],
  },
  {
    label: 'Santé & sport',
    icons: [
      'heart-pulse', 'pill', 'stethoscope', 'activity', 'dumbbell',
      'baby', 'syringe', 'shield-plus', 'heart', 'bandage', 'apple',
    ],
  },
  {
    label: 'Loisirs',
    icons: [
      'gamepad-2', 'music', 'film', 'camera', 'book-open', 'graduation-cap',
      'palette', 'party-popper', 'ticket', 'headphones', 'mic', 'dice-5',
      'mountain', 'waves', 'umbrella', 'tent', 'telescope', 'joystick',
    ],
  },
  {
    label: 'Finances',
    icons: [
      'wallet', 'piggy-bank', 'trending-up', 'trending-down', 'banknote',
      'coins', 'landmark', 'hand-coins', 'circle-dollar-sign', 'percent',
      'bar-chart-2', 'receipt',
    ],
  },
  {
    label: 'Travail',
    icons: [
      'briefcase', 'laptop', 'monitor', 'printer', 'file-text', 'pen-line',
      'building-2', 'hard-hat', 'users', 'handshake', 'clipboard', 'inbox',
    ],
  },
  {
    label: 'Nature & divers',
    icons: [
      'leaf', 'sun', 'moon', 'cloud', 'tree-pine', 'flower-2',
      'dog', 'cat', 'paw-print', 'zap', 'snowflake', 'droplets',
      'sparkles', 'star', 'globe', 'map',
    ],
  },
];

const ALL_ICONS = ICON_GROUPS.flatMap(g => g.icons);

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

// ── Icon picker sub-component ─────────────────────────────────────
function IconPicker({ value, hue, onChange }: { value: string; hue: number; onChange: (v: string) => void }) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const query = search.trim().toLowerCase();

  const filtered = query
    ? ALL_ICONS.filter(n => n.includes(query))
    : null;

  const btnStyle = (name: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
    flexShrink: 0,
    background: value === name ? `oklch(0.6 0.12 ${hue} / 0.2)` : 'var(--surface-2)',
    color: value === name ? `oklch(0.5 0.13 ${hue})` : 'var(--text-2)',
    outline: value === name ? `2px solid oklch(0.6 0.12 ${hue})` : 'none',
    outlineOffset: -2,
    transition: 'background 0.1s',
  });

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
        <input
          ref={searchRef}
          className="input"
          style={{ width: '100%', paddingLeft: 30, boxSizing: 'border-box' }}
          placeholder="Rechercher une icône…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{
        height: 188, overflowY: 'auto', overflowX: 'hidden',
        border: '1px solid var(--line)', borderRadius: 10,
        padding: '8px 10px',
      }}>
        {filtered ? (
          // Flat search results
          filtered.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 4px' }}>Aucun résultat</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {filtered.map(name => {
                const Ic = iconNameToComponent(name);
                if (!Ic) return null;
                return (
                  <button key={name} title={name} onClick={() => onChange(name)} style={btnStyle(name)}>
                    <Ic size={16} />
                  </button>
                );
              })}
            </div>
          )
        ) : (
          // Grouped view
          ICON_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.icons.map(name => {
                  const Ic = iconNameToComponent(name);
                  if (!Ic) return null;
                  return (
                    <button key={name} title={name} onClick={() => onChange(name)} style={btnStyle(name)}>
                      <Ic size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Current icon name hint */}
      <div style={{ marginTop: 5, fontSize: 12, color: 'var(--text-3)' }}>
        {value
          ? <>Sélectionné : <code style={{ fontFamily: 'monospace' }}>{value}</code></>
          : 'Aucune icône sélectionnée'}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export function CategoriesModal({ categories, isPending, onClose, onCreate, onUpdate, onDelete }: Props) {
  const [view, setView] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<Category | null>(null);

  const [nom, setNom] = useState('');
  const [icone, setIcone] = useState('tag');
  const [hue, setHue] = useState(220);
  const [confirmDel, setConfirmDel] = useState(false);

  const nomRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditing(null); setNom(''); setIcone('tag'); setHue(220); setConfirmDel(false);
    setView('edit');
  };

  const openEdit = (cat: Category) => {
    setEditing(cat); setNom(cat.nom); setIcone(cat.icone); setHue(cat.hue); setConfirmDel(false);
    setView('edit');
  };

  const backToList = () => { setView('list'); setEditing(null); setConfirmDel(false); };

  useEffect(() => {
    if (view === 'edit') setTimeout(() => nomRef.current?.select(), 30);
  }, [view]);

  const IconComp = iconNameToComponent(icone);
  const valid = nom.trim().length > 0 && IconComp !== null;

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

  // ── List view ─────────────────────────────────────────────────────
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
                  padding: '9px 20px',
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

  // ── Edit / Create view ────────────────────────────────────────────
  return (
    <Modal title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={onClose}>
      <div className="modal-body">

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
          padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
          <CategoryIcon name={icone} hue={hue} size={24} />
          <span style={{ fontSize: 15, fontWeight: 600, color: nom.trim() ? 'var(--text-1)' : 'var(--text-3)' }}>
            {nom.trim() || 'Aperçu'}
          </span>
          {!IconComp && icone.length > 0 && (
            <span style={{ marginLeft: 'auto', color: 'var(--neg)', fontSize: 12 }}>Icône introuvable</span>
          )}
        </div>

        {/* Nom */}
        <div className="field-label">Nom</div>
        <input
          ref={nomRef}
          className="input field"
          placeholder="Ex. Alimentation, Transport…"
          value={nom}
          onChange={e => setNom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && valid && !isPending) handleSave(); }}
        />

        {/* Icône picker */}
        <div className="field-label" style={{ marginTop: 14 }}>Icône</div>
        <IconPicker value={icone} hue={hue} onChange={setIcone} />

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
            background: `oklch(0.6 0.15 ${hue})`, display: 'inline-block',
          }} />
        </div>
      </div>

      <div className="modal-foot" style={{ flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn ghost" onClick={backToList} style={{ gap: 6 }} disabled={!!isPending}>
            <ArrowLeft size={14} /> Retour
          </button>
          <button className="btn primary" disabled={!valid || !!isPending} style={{ flex: 1 }} onClick={handleSave}>
            {isPending ? <Loader2 size={15} className="spin" /> : <><Check size={15} /> {editing ? 'Enregistrer' : 'Créer'}</>}
          </button>
        </div>

        {editing && (
          confirmDel ? (
            <button
              className="btn danger"
              style={{ width: '100%', background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }}
              disabled={!!isPending}
              onClick={handleDelete}
            >
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
