import { Columns2, Smartphone, Sun, Moon, Plus, X, Download } from 'lucide-react';
import type { Account, Member } from '../../api/client';

interface Props {
  tabs: string[];
  accounts: Account[];
  members: Member[];
  activeId: string | null;
  splitOn: boolean;
  theme: 'light' | 'dark';
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNewTab: () => void;
  onToggleSplit: () => void;
  onToggleTheme: () => void;
  onInstall: () => void;
}

export function TabBar({ tabs, accounts, members, activeId, splitOn, theme, onSelect, onClose, onNewTab, onToggleSplit, onToggleTheme, onInstall }: Props) {
  return (
    <div className="tabbar">
      <div className="tabs">
        {tabs.map(id => {
          const a = accounts.find(x => x.id === id);
          if (!a) return null;
          const m = members.find(mm => mm.id === a.memberId);
          return (
            <div key={id} className={`tab${id === activeId ? ' active' : ''}`} onClick={() => onSelect(id)}>
              <i className="account-dot" style={{ background: `var(--m-${m?.couleur})` }} />
              <span className="tab-name">{a.nom}</span>
              <span className="tab-close" onClick={e => { e.stopPropagation(); onClose(id); }}><X size={13} /></span>
            </div>
          );
        })}
        <button className="icon-btn" style={{ alignSelf: 'center', flex: '0 0 auto' }} onClick={onNewTab} title="Nouvel onglet">
          <Plus size={17} />
        </button>
      </div>
      <div className="tabbar-actions">
        <button className={`icon-btn${splitOn ? ' on' : ''}`} onClick={onToggleSplit} title="Scinder la vue"><Columns2 size={18} /></button>
        <button className="icon-btn" onClick={onToggleTheme} title="Thème clair/sombre">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="btn sm" onClick={onInstall} style={{ marginLeft: 4 }}><Download size={15} /> Installer</button>
      </div>
    </div>
  );
}
