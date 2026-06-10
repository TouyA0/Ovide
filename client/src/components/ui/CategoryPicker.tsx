import * as LucideIcons from 'lucide-react';
import type { Category } from '../../api/client';

const INCOME_CATS = ['c_salaire', 'c_revenus', 'c_divers'];

interface Props {
  categories: Category[];
  selected: string | null;
  onChange: (id: string | null) => void;
  filter?: 'income' | 'expense' | 'all';
}

function toIconName(icone: string) {
  return icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

export function CategoryPicker({ categories, selected, onChange, filter = 'all' }: Props) {
  const shown = filter === 'income'
    ? categories.filter(c => INCOME_CATS.includes(c.id))
    : filter === 'expense'
    ? categories.filter(c => !['c_salaire', 'c_revenus'].includes(c.id))
    : categories;

  return (
    <div className="chip-grid">
      {shown.map(c => {
        const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[toIconName(c.icone)];
        const on = selected === c.id;
        return (
          <button
            key={c.id}
            className={`chip${on ? ' on' : ''}`}
            onClick={() => onChange(on ? null : c.id)}
          >
            <span className="c-ic" style={{
              background: on ? `oklch(0.6 0.12 ${c.hue})` : `oklch(0.6 0.12 ${c.hue} / 0.14)`,
              color: on ? '#fff' : `oklch(0.5 0.13 ${c.hue})`,
            }}>
              {IconComp ? <IconComp size={14} /> : null}
            </span>
            <span className="chip-name">{c.nom}</span>
          </button>
        );
      })}
    </div>
  );
}
