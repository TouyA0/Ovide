import { useState, useMemo } from 'react';
import { Plus, ArrowLeftRight, Eye, EyeOff, Download, TrendingUp, TrendingDown, Search, X, Check, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { BalanceChart } from '../charts/BalanceChart';
import { IncomeExpenseBars } from '../charts/IncomeExpenseBars';
import { CategoryDonut } from '../charts/CategoryDonut';
import {
  useTransactions, useBalanceSeries, useBars, useComparison, useDonut, useForecast,
} from '../../hooks/useData';
import { fmtEur, fmtEurShort, fmtDateLong, fmtChange, pctDelta, relDay, MONTHS_FULL } from '../../utils/format';
import type { Account, Member, Category, Transaction, ForecastItem } from '../../api/client';

interface Props {
  account: Account;
  member: Member;
  categories: Category[];
  isSplitTarget?: boolean;
  onAdd: () => void;
  onTransfer: () => void;
  onExport: () => void;
  onEdit: (tx: Transaction) => void;
  onConfirmForecast: (f: ForecastItem) => void;
  onTogglePrevisions: () => void;
}

export function AccountPane({ account, member, categories, isSplitTarget, onAdd, onTransfer, onExport, onEdit, onConfirmForecast, onTogglePrevisions }: Props) {
  return (
    <div className={`pane m-active${isSplitTarget ? ' is-split-target' : ''}`}>
      <div className="pane-inner">
        <BalanceHeader account={account} member={member} onAdd={onAdd} onTransfer={onTransfer} onExport={onExport} onTogglePrevisions={onTogglePrevisions} />
        <StatsSection account={account} member={member} categories={categories} />
        <TransactionList account={account} categories={categories} onEdit={onEdit} onConfirmForecast={onConfirmForecast} />
      </div>
    </div>
  );
}

/* ---- Balance header ---- */
function BalanceHeader({ account, member, onAdd, onTransfer, onExport, onTogglePrevisions }: Omit<Props, 'categories' | 'isSplitTarget' | 'onEdit' | 'onConfirmForecast'>) {
  const cmp = useComparison(account.id);
  const cur = cmp.data?.cur ?? { net: 0, income: 0, expense: 0 };
  const prev = cmp.data?.prev ?? { net: 0, income: 0, expense: 0 };
  const up = cur.net >= prev.net;

  const bal = account.balance;
  const balStr = fmtEur(bal).replace(' €', '');
  const [intp, dec] = balStr.split(',');

  return (
    <div className="bal-head">
      <div className="bal-main">
        <div className="bal-crumb">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="account-dot" style={{ background: `var(--m-${member.couleur})`, width: 9, height: 9 }} />
            {member.nom}
          </span>
          <span className="sep">/</span>
          <span>{account.type === 'epargne' ? 'Épargne' : account.type === 'courant' ? 'Courant' : 'Compte'}</span>
        </div>
        <div className="acct-title">
          <h1>{account.nom}</h1>
          <span className="type-chip">{account.type === 'epargne' ? 'Épargne' : account.type === 'courant' ? 'Courant' : 'Autre'}</span>
        </div>
        <div className="balance-amount tnum">{intp}<span className="cents">,{dec} €</span></div>
        <div className={`balance-delta ${up ? 'delta-up' : 'delta-down'}`}>
          <span className="pill" style={{ whiteSpace: 'nowrap' }}>
            {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {fmtChange(cur.net, prev.net)}
          </span>
          <span className="delta-note">net vs mois dernier</span>
        </div>
      </div>
      <div className="bal-actions">
        <button className="btn primary" onClick={onAdd}><Plus size={16} strokeWidth={2.4} /> Ajouter</button>
        <button className="btn" onClick={onTransfer}><ArrowLeftRight size={16} /> Virement</button>
        {account.type === 'courant' && (
          <button className="btn" onClick={onTogglePrevisions}>
            {account.previsionsActivees ? <Eye size={16} /> : <EyeOff size={16} />} Prévisions
          </button>
        )}
        <button className="btn" onClick={onExport}><Download size={16} /> CSV</button>
      </div>
    </div>
  );
}

/* ---- Stats section ---- */
function StatsSection({ account, member, categories }: { account: Account; member: Member; categories: Category[] }) {
  const [range, setRange] = useState<'mois' | 'six' | 'annee'>('six');
  const today = new Date().toISOString().slice(0, 10);
  const TM = parseInt(today.split('-')[1]);
  const monthName = MONTHS_FULL[TM - 1];

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  const balSeries = useBalanceSeries(account.id, range);
  const bars = useBars(account.id, range === 'annee' ? 12 : 6);
  const cmp = useComparison(account.id);
  const donutRaw = useDonut(account.id);
  const accentVar = `--m-${member.couleur}`;

  const donutSlices = useMemo(() => {
    if (!donutRaw.data) return [];
    return donutRaw.data.map(d => {
      const cat = d.categorieId ? catMap[d.categorieId] : null;
      return { nom: cat?.nom ?? 'Divers', hue: cat?.hue ?? 60, value: d.total };
    });
  }, [donutRaw.data, catMap]);

  const cur = cmp.data?.cur ?? { net: 0, income: 0, expense: 0 };
  const prev = cmp.data?.prev ?? { net: 0, income: 0, expense: 0 };

  const cards = [
    { label: 'Net du mois', icon: <Wallet size={14} />, cur: cur.net, prev: prev.net, signed: true },
    { label: 'Entrées', icon: <ArrowDownLeft size={14} />, cur: cur.income, prev: prev.income, pos: true },
    { label: 'Dépenses', icon: <ArrowUpRight size={14} />, cur: cur.expense, prev: prev.expense, neg: true },
  ];

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
      <div className="cmp-grid">
        {cards.map((c, i) => {
          const d = pctDelta(c.cur, c.prev);
          const better = c.neg ? d <= 0 : d >= 0;
          return (
            <div className="cmp" key={i}>
              <div className="label">{c.icon} {c.label}</div>
              <div className="val tnum" style={{ color: c.pos ? 'var(--pos)' : c.neg ? 'var(--text)' : (c.cur >= 0 ? 'var(--pos)' : 'var(--neg)') }}>
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

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Évolution du solde</div>
            <div className="card-sub">Solde de fin de mois</div>
          </div>
          <div className="seg">
            <button className={range === 'mois' ? 'on' : ''} onClick={() => setRange('mois')}>Mois</button>
            <button className={range === 'six' ? 'on' : ''} onClick={() => setRange('six')}>6 mois</button>
            <button className={range === 'annee' ? 'on' : ''} onClick={() => setRange('annee')}>12 mois</button>
          </div>
        </div>
        {balSeries.data && <BalanceChart series={balSeries.data} accentVar={accentVar} />}
      </div>

      <div className="grid charts-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Entrées vs dépenses</div>
            <div className="card-sub">{range === 'annee' ? '12 mois' : '6 mois'}</div>
          </div>
          {bars.data && <IncomeExpenseBars data={bars.data} />}
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Répartition</div>
            <div className="card-sub">{monthName}</div>
          </div>
          {donutSlices.length > 0
            ? <CategoryDonut slices={donutSlices} />
            : <div className="empty" style={{ padding: '28px 10px' }}>Aucune dépense ce mois-ci.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---- Transaction list ---- */
function TransactionList({ account, categories, onEdit, onConfirmForecast }: {
  account: Account; categories: Category[];
  onEdit: (tx: Transaction) => void;
  onConfirmForecast: (f: ForecastItem) => void;
}) {
  const [q, setQ] = useState('');
  const txQuery = useTransactions(account.id);
  const forecastQuery = useForecast(account.id);
  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  const txs = txQuery.data ?? [];
  const forecast = forecastQuery.data ?? [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return txs;
    return txs.filter(t => {
      const c = t.categorieId ? catMap[t.categorieId] : null;
      return (t.libelle ?? '').toLowerCase().includes(s) || (c && c.nom.toLowerCase().includes(s));
    });
  }, [txs, q, catMap]);

  const groups = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    filtered.forEach(t => { (g[t.date] = g[t.date] || []).push(t); });
    return Object.keys(g).sort((a, b) => b.localeCompare(a)).map(date => ({ date, items: g[date] }));
  }, [filtered]);

  function signed(t: Transaction) {
    if (t.type === 'income') return t.montant;
    if (t.type === 'expense') return -t.montant;
    return t.dir === 'in' ? t.montant : -t.montant;
  }

  return (
    <div className="tx-section">
      <div className="tx-toolbar">
        <h2>Transactions</h2>
        <span className="count">{txs.length}</span>
        <div className="tx-search">
          <Search size={15} />
          <input placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setQ('')}><X size={14} /></button>}
        </div>
      </div>

      {forecast.length > 0 && !q && (
        <div style={{ marginBottom: 6 }}>
          <div className="tx-day-label"><span>À venir ce mois-ci · projeté</span></div>
          <div className="tx-list">
            {forecast.map(f => {
              const c = f.categorieId ? catMap[f.categorieId] : null;
              const IconComp = c ? (LucideIcons as Record<string, React.ComponentType<{ size?: number }>>)[
                c.icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
              ] : null;
              return (
                <div className="tx-row projected" key={f.id}>
                  <span className="tx-ico">{IconComp ? <IconComp size={17} /> : null}</span>
                  <div className="tx-body">
                    <div className="tx-label">{f.libelle} <span className="proj-tag">prévu</span></div>
                    <div className="tx-meta">{fmtDateLong(f.date)} · {c?.nom ?? ''}</div>
                  </div>
                  <div className={`tx-amount ${f.sens === 'income' ? 'inc' : 'exp'}`} style={{ marginRight: 12 }}>
                    {f.sens === 'income' ? '+' : '−'}{fmtEurShort(f.montant)}
                  </div>
                  <button className="btn-confirm" onClick={() => onConfirmForecast(f)}>
                    <Check size={14} /> Confirmer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="empty">
          <div className="e-ic"><span style={{ fontSize: 22 }}>🧾</span></div>
          {q ? 'Aucun résultat.' : 'Aucune transaction pour le moment.'}
        </div>
      )}

      {groups.map(grp => {
        const daySum = grp.items.reduce((s, t) => s + (t.type === 'transfer' ? 0 : signed(t)), 0);
        return (
          <div key={grp.date}>
            <div className="tx-day-label">
              <span>{relDay(grp.date)}</span>
              {daySum !== 0 && <span className="day-sum tnum" style={{ color: daySum > 0 ? 'var(--pos)' : 'var(--text-3)' }}>{daySum > 0 ? '+' : ''}{fmtEur(daySum)}</span>}
            </div>
            <div className="tx-list">
              {grp.items.map(t => {
                const c = t.categorieId ? catMap[t.categorieId] : null;
                const isTr = t.type === 'transfer';
                const hue = c?.hue ?? 250;
                const IconComp = c ? (LucideIcons as Record<string, React.ComponentType<{ size?: number }>>)[
                  c.icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
                ] : null;
                return (
                  <button className="tx-row" key={t.id} onClick={() => onEdit(t)}>
                    <span className="tx-ico" style={{ background: isTr ? 'var(--surface-2)' : `oklch(0.6 0.12 ${hue} / 0.13)`, color: isTr ? 'var(--text-2)' : `oklch(0.5 0.13 ${hue})` }}>
                      {isTr ? <ArrowLeftRight size={17} /> : (IconComp ? <IconComp size={17} /> : null)}
                    </span>
                    <div className="tx-body">
                      <div className="tx-label">{t.libelle || (c ? c.nom : (isTr ? 'Virement' : 'Opération'))}</div>
                      <div className="tx-meta">
                        {isTr ? <span>Virement {t.dir === 'in' ? 'reçu' : 'émis'}</span>
                          : <><i className="cat-dot" style={{ background: `oklch(0.6 0.12 ${hue})` }} /><span>{c?.nom ?? 'Divers'}</span></>}
                      </div>
                    </div>
                    <span className={`tx-amount ${t.type === 'income' ? 'inc' : isTr ? '' : 'exp'}`}
                      style={isTr ? { color: t.dir === 'in' ? 'var(--pos)' : 'var(--text-2)' } : {}}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : (t.dir === 'in' ? '+' : '−')}{fmtEur(t.montant)}
                    </span>
                    <span className="tx-edit-hint"><LucideIcons.ChevronRight size={16} /></span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
