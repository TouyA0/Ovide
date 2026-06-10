import { useState } from 'react';
import { WalletMinimal, ChevronRight, UserPlus, ArchiveX } from 'lucide-react';
import { fmtEurShort } from '../../utils/format';
import type { Member, Account } from '../../api/client';

interface Props {
  members: Member[];
  accounts: Account[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onContext: (x: number, y: number, accId: string) => void;
  onMemberContext: (x: number, y: number, member: Member) => void;
  onAddAccount: (memberId: string) => void;
  onAddMember: () => void;
}

export function Sidebar({ members, accounts, activeId, onOpen, onContext, onMemberContext, onAddAccount, onAddMember }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(members.map(m => [m.id, true]))
  );
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({});

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><WalletMinimal size={19} /></div>
        <div>
          <div className="brand-name">Foyer</div>
          <div className="brand-sub">Comptes</div>
        </div>
      </div>
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
                onClick={() => setOpen(o => ({ ...o, [m.id]: !o[m.id] }))}
                onContextMenu={e => { e.preventDefault(); onMemberContext(e.clientX, e.clientY, m); }}
              >
                <span className="avatar" style={{ background: `var(--m-${m.couleur})` }}>{m.initiales}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{m.nom}</span>
                <span className="member-total tnum">{fmtEurShort(total)}</span>
                <span className={`chev${open[m.id] ? ' open' : ''}`}><ChevronRight size={15} /></span>
              </button>
              {open[m.id] && (
                <div className="account-list">
                  {accs.map(a => (
                    <button key={a.id} className={`account-item${a.id === activeId ? ' active' : ''}`}
                      onClick={() => onOpen(a.id)}
                      onContextMenu={e => { e.preventDefault(); onContext(e.clientX, e.clientY, a.id); }}>
                      <i className="account-dot" style={{ background: a.type === 'epargne' ? 'oklch(0.6 0.02 70)' : `var(--m-${m.couleur})` }} />
                      <span className="account-name">{a.nom}</span>
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
      </div>
    </aside>
  );
}
