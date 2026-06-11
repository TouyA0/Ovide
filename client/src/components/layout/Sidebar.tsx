import { useState } from 'react';
import { WalletMinimal, ChevronRight, UserPlus, ArchiveX, Tags } from 'lucide-react';
import { fmtEurShort } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import type { Member, Account } from '../../api/client';

interface Props {
  members: Member[];
  accounts: Account[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onOpenDashboard: () => void;
  onContext: (x: number, y: number, accId: string) => void;
  onMemberContext: (x: number, y: number, member: Member) => void;
  onAddAccount: (memberId: string) => void;
  onAddMember: () => void;
  onOpenCategories: () => void;
}

export function Sidebar({ members, accounts, activeId, onOpen, onOpenDashboard, onContext, onMemberContext, onAddAccount, onAddMember, onOpenCategories }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(members.map(m => [m.id, true]))
  );
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({});

  return (
    <aside className="sidebar">
      <button className="brand" onClick={onOpenDashboard} style={{ width: '100%', textAlign: 'left' }}>
        <div className="brand-mark"><WalletMinimal size={19} /></div>
        <div>
          <div className="brand-name">Foyer</div>
          <div className="brand-sub">Comptes</div>
        </div>
      </button>
      <div className="side-scroll">
        <div className="side-section-label">Membres</div>
        {members.map(m => {
          const accs = accounts.filter(a => a.memberId === m.id && !a.archive);
          const archived = accounts.filter(a => a.memberId === m.id && a.archive);
          const total = accs.reduce((s, a) => s + a.balance, 0);
          const archivedOpen = showArchived[m.id] ?? false;

          return (
            <div className="member-group" key={m.id}>
              <button
                className="member-head"
                data-ctx-menu
                onClick={() => setOpen(o => ({ ...o, [m.id]: !o[m.id] }))}
                onContextMenu={e => { e.preventDefault(); onMemberContext(e.clientX, e.clientY, m); }}
              >
                <Avatar member={m} />
                <span style={{ flex: 1, textAlign: 'left' }}>{m.nom}</span>
                <span className="member-total tnum">{fmtEurShort(total)}</span>
                <span className={`chev${open[m.id] ? ' open' : ''}`}><ChevronRight size={15} /></span>
              </button>
              {open[m.id] && (
                <div className="account-list">
                  {accs.map(a => (
                    <button key={a.id} className={`account-item${a.id === activeId ? ' active' : ''}${a.balance < 0 ? ' neg' : ''}`}
                      data-ctx-menu
                      onClick={() => onOpen(a.id)}
                      onContextMenu={e => { e.preventDefault(); onContext(e.clientX, e.clientY, a.id); }}>
                      <i className="account-dot" style={{ background: a.type === 'epargne' ? 'oklch(0.6 0.02 70)' : `var(--m-${m.couleur})` }} />
                      <span className="account-name">
                        <span className="acc-label-main">{a.nom}</span>
                        <span className="acc-label-sub">{(() => { const t = a.type === 'epargne' ? 'Épargne' : a.type === 'courant' ? 'Courant' : 'Autre'; return a.banque ? `${t} — ${a.banque}` : t; })()}</span>
                      </span>
                      <span className="account-bal tnum">{fmtEurShort(a.balance)}</span>
                    </button>
                  ))}

                  {archived.length > 0 && (
                    <>
                      <button
                        className="account-item"
                        style={{ color: 'var(--text-3)', gap: 6 }}
                        onClick={() => setShowArchived(s => ({ ...s, [m.id]: !archivedOpen }))}
                      >
                        <ArchiveX size={13} style={{ flexShrink: 0, marginLeft: 1 }} />
                        <span className="account-name" style={{ fontSize: 12 }}>
                          {archivedOpen ? 'Masquer' : `${archived.length} archivé${archived.length > 1 ? 's' : ''}`}
                        </span>
                        <span className={`chev${archivedOpen ? ' open' : ''}`} style={{ marginLeft: 'auto' }}>
                          <ChevronRight size={13} />
                        </span>
                      </button>
                      {archivedOpen && archived.map(a => (
                        <button key={a.id} className="account-item"
                          data-ctx-menu
                          style={{ opacity: 0.5, paddingLeft: 28, cursor: 'context-menu' }}
                          onContextMenu={e => { e.preventDefault(); onContext(e.clientX, e.clientY, a.id); }}>
                          <i className="account-dot" style={{ background: 'var(--line-strong)' }} />
                          <span className="account-name" style={{ fontStyle: 'italic' }}>{a.nom}</span>
                        </button>
                      ))}
                    </>
                  )}

                  <button className="account-item" style={{ color: 'var(--text-3)' }} onClick={() => onAddAccount(m.id)}>
                    <i className="account-dot" style={{ background: 'transparent', border: '1.5px dashed var(--line-strong)' }} />
                    <span className="account-name">Ajouter un compte</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="side-foot">
        <button className="side-action" onClick={onAddMember}><UserPlus size={17} /> Ajouter un membre</button>
        <button className="side-action" onClick={onOpenCategories}><Tags size={17} /> Catégories</button>
      </div>
    </aside>
  );
}
