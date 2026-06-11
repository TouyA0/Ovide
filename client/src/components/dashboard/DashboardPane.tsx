import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { IncomeExpenseBars } from '../charts/IncomeExpenseBars';
import { useGlobalStats } from '../../hooks/useData';
import { fmtEur, fmtChange, pctDelta } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import type { Account, Member } from '../../api/client';

interface Props {
  members: Member[];
  accounts: Account[];
  onOpenAccount: (id: string) => void;
}

export function DashboardPane({ members, accounts, onOpenAccount }: Props) {
  const statsQ = useGlobalStats();
  const stats = statsQ.data;

  const activeAccounts = useMemo(() => accounts.filter(a => !a.archive), [accounts]);

  const totalBalance = useMemo(
    () => activeAccounts.reduce((s, a) => s + a.balance, 0),
    [activeAccounts]
  );

  type MRow = { m: Member; accs: Account[]; balance: number; pct: number; cur: { income: number; expense: number; net: number }; prev: { income: number; expense: number; net: number } };

  const memberRows = useMemo<MRow[]>(() => {
    return members.flatMap(m => {
      const accs = activeAccounts.filter(a => a.memberId === m.id);
      if (!accs.length) return [];
      const balance = accs.reduce((s: number, a: Account) => s + a.balance, 0);
      const pct = totalBalance ? Math.round(Math.abs(balance) / Math.abs(totalBalance) * 100) : 0;
      const cur = stats?.byMember[m.id]?.cur ?? { income: 0, expense: 0, net: 0 };
      const prev = stats?.byMember[m.id]?.prev ?? { income: 0, expense: 0, net: 0 };
      return [{ m, accs, balance, pct, cur, prev }];
    });
  }, [members, activeAccounts, totalBalance, stats]);

  const globalCur = stats?.globalCur ?? { income: 0, expense: 0, net: 0 };
  const globalPrev = stats?.globalPrev ?? { income: 0, expense: 0, net: 0 };

  const balStr = fmtEur(totalBalance).replace(' €', '');
  const [intp, dec] = balStr.split(',');
  const netUp = globalCur.net >= globalPrev.net;

  return (
    <div className="pane m-active">
      <div className="pane-inner">

        {/* ── En-tête ── */}
        <div className="bal-head">
          <div className="bal-main">
            <div className="bal-crumb">Foyer <span className="sep">/</span> Vue d'ensemble</div>
            <div className="acct-title"><h1>Total foyer</h1></div>
            <div className="balance-amount tnum">{intp}<span className="cents">,{dec} €</span></div>
            <div className={`balance-delta ${netUp ? 'delta-up' : 'delta-down'}`}>
              <span className="pill" style={{ whiteSpace: 'nowrap' }}>
                {netUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {fmtChange(globalCur.net, globalPrev.net)}
              </span>
              <span className="delta-note">net vs mois dernier</span>
            </div>
          </div>
        </div>

        {/* ── Membres ── */}
        <div className="tx-section" style={{ marginTop: 20 }}>
          <div className="tx-toolbar"><h2>Membres</h2></div>
          <div className="cmp-grid" style={{ marginTop: 8 }}>
            {memberRows.map(({ m, accs, balance, pct, cur, prev }) => {
              const netUp = cur.net >= prev.net;
              return (
                <div key={m.id} className="cmp" style={{ gap: 0 }}>
                  {/* Header membre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Avatar member={m} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>{m.nom}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{pct}%</span>
                  </div>
                  {/* Solde */}
                  <div className="val tnum" style={{ marginBottom: 8 }}>{fmtEur(balance)}</div>
                  {/* Barre de proportion */}
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `var(--m-${m.couleur})`, borderRadius: 2, transition: 'width .4s ease' }} />
                  </div>
                  {/* Net du mois */}
                  <div className="chg" style={{ color: netUp ? 'var(--pos)' : 'var(--neg)', marginBottom: 12 }}>
                    {netUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {fmtChange(cur.net, prev.net)}
                    <span className="muted" style={{ fontWeight: 500 }}>net ce mois</span>
                  </div>
                  {/* Comptes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {accs.map(a => (
                      <button key={a.id} className="dashboard-acc-link" onClick={() => onOpenAccount(a.id)}>
                        <i className="account-dot" style={{ background: a.type === 'epargne' ? 'oklch(0.6 0.02 70)' : `var(--m-${m.couleur})`, flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nom}</span>
                        <span className="tnum" style={{ fontWeight: 600, flexShrink: 0, color: 'var(--text-2)' }}>{fmtEur(a.balance)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Ce mois-ci ── */}
        <div className="tx-section" style={{ marginTop: 8 }}>
          <div className="tx-toolbar"><h2>Ce mois-ci — Foyer</h2></div>
          <div className="cmp-grid" style={{ marginTop: 8 }}>
            {[
              { label: 'Net du mois', icon: <Wallet size={14} />, cur: globalCur.net, prev: globalPrev.net, signed: true },
              { label: 'Entrées', icon: <ArrowDownLeft size={14} />, cur: globalCur.income, prev: globalPrev.income, pos: true },
              { label: 'Dépenses', icon: <ArrowUpRight size={14} />, cur: globalCur.expense, prev: globalPrev.expense, neg: true },
            ].map((c, i) => {
              const d = pctDelta(c.cur, c.prev);
              const better = (c as { neg?: boolean }).neg ? d <= 0 : d >= 0;
              return (
                <div className="cmp" key={i}>
                  <div className="label">{c.icon} {c.label}</div>
                  <div className="val tnum" style={{ color: (c as { pos?: boolean }).pos ? 'var(--pos)' : (c as { neg?: boolean }).neg ? 'var(--text)' : (c.cur >= 0 ? 'var(--pos)' : 'var(--neg)') }}>
                    {c.signed && c.cur >= 0 ? '+' : ''}{fmtEur(c.cur)}
                  </div>
                  <div className="chg" style={{ color: better ? 'var(--pos)' : 'var(--neg)', whiteSpace: 'nowrap' }}>
                    {d >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {fmtChange(c.cur, c.prev)}
                    <span className="muted" style={{ fontWeight: 500 }}>vs mois dernier</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bar chart global ── */}
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-head">
            <div>
              <div className="card-title">Entrées vs dépenses — Foyer</div>
              <div className="card-sub">6 derniers mois</div>
            </div>
          </div>
          {stats
            ? <IncomeExpenseBars data={stats.monthlyBars} />
            : <div className="sk sk-block" style={{ height: 100 }} />
          }
        </div>

      </div>
    </div>
  );
}
