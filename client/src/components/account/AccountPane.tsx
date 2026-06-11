import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, ArrowLeftRight, Eye, EyeOff, TrendingUp, TrendingDown, Search, X, Check, Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, CalendarClock, GripVertical, Upload, Trash2, FileText, Loader2, ChevronLeft, ChevronRight, Ban, Paperclip } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { BalanceChart } from '../charts/BalanceChart';
import { IncomeExpenseBars } from '../charts/IncomeExpenseBars';
import { CategoryDonut } from '../charts/CategoryDonut';
import { RecurrenceFormModal } from '../modals/RecurrenceFormModal';
import {
  useTransactions, useBalanceSeries, useBars, useComparison, useDonut, useForecast,
  useRecurrences, useCreateRecurrence, useUpdateRecurrence, useDeleteRecurrence, useReorderRecurrences,
  useImports, useDeleteImport,
} from '../../hooks/useData';
import { fmtEur, fmtEurShort, fmtChange, pctDelta, MONTHS_FULL, MONTHS } from '../../utils/format';
import type { Account, Member, Category, Transaction, ForecastItem, Recurrence, BankImport } from '../../api/client';

interface Props {
  account: Account;
  member: Member;
  accounts: Account[];
  members: Member[];
  categories: Category[];
  isSplitTarget?: boolean;
  mobileSection?: 'transactions' | 'stats';
  onAdd: () => void;
  onTransfer: () => void;
  onImport: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onTxContext: (x: number, y: number, tx: Transaction) => void;
  onConfirmForecast: (f: ForecastItem, date?: string) => Promise<string>;
  onSkipForecast: (f: ForecastItem) => Promise<void>;
  onTogglePrevisions: () => void;
}

export function AccountPane({ account, member, accounts, members, categories, isSplitTarget, mobileSection = 'transactions', onAdd, onTransfer, onImport, onEdit, onDelete, onTxContext, onConfirmForecast, onSkipForecast, onTogglePrevisions }: Props) {
  return (
    <div className={`pane m-active${isSplitTarget ? ' is-split-target' : ''}`} data-section={mobileSection}>
      <div className="pane-inner">
        <BalanceHeader account={account} member={member} onAdd={onAdd} onTransfer={onTransfer} onImport={onImport} onTogglePrevisions={onTogglePrevisions} />
        <div className="m-section-stats">
          <StatsSection account={account} member={member} categories={categories} />
        </div>
        <div className="m-section-tx">
          <TransactionList account={account} accounts={accounts} members={members} categories={categories} onEdit={onEdit} onDelete={onDelete} onTxContext={onTxContext} onConfirmForecast={onConfirmForecast} onSkipForecast={onSkipForecast} />
          {account.type === 'courant' && (
            <RecurrencesSection account={account} categories={categories} />
          )}
          <ImportsSection account={account} />
        </div>
      </div>
    </div>
  );
}

/* ---- Balance header ---- */
function BalanceHeader({ account, member, onAdd, onTransfer, onImport, onTogglePrevisions }: Pick<Props, 'account' | 'member' | 'onAdd' | 'onTransfer' | 'onImport' | 'onTogglePrevisions'>) {
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
        {account.banque && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{account.banque}</div>
        )}
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
        <button className="btn" onClick={onImport}><Upload size={16} /> Importer</button>
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

  const cmpLoading = !cmp.data;
  const balLoading = !balSeries.data;
  const barsLoading = !bars.data;
  const donutLoading = !donutRaw.data;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
      <div className="cmp-grid">
        {cmpLoading ? [0, 1, 2].map(i => (
          <div className="cmp" key={i}>
            <div className="sk sk-text" style={{ width: '60%', marginBottom: 10 }} />
            <div className="sk sk-val" style={{ width: '80%', marginBottom: 8 }} />
            <div className="sk sk-text" style={{ width: '70%' }} />
          </div>
        )) : cards.map((c, i) => {
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
            <div className="card-sub">{range === 'mois' ? 'Solde jour par jour' : 'Solde de fin de mois'}</div>
          </div>
          <div className="seg">
            <button className={range === 'mois' ? 'on' : ''} onClick={() => setRange('mois')}>Mois</button>
            <button className={range === 'six' ? 'on' : ''} onClick={() => setRange('six')}>6 mois</button>
            <button className={range === 'annee' ? 'on' : ''} onClick={() => setRange('annee')}>12 mois</button>
          </div>
        </div>
        {balLoading
          ? <div className="sk sk-block" style={{ height: 140 }} />
          : <BalanceChart series={balSeries.data!.series} projection={balSeries.data!.projection} accentVar={accentVar} />}
      </div>

      <div className="grid charts-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Entrées vs dépenses</div>
            <div className="card-sub">{range === 'annee' ? '12 mois' : '6 mois'}</div>
          </div>
          {barsLoading
            ? <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '0 4px' }}>
                {[55, 80, 40, 70, 90, 60].map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div className="sk sk-block" style={{ height: h * 0.5 }} />
                    <div className="sk sk-block" style={{ height: h * 0.7 }} />
                  </div>
                ))}
              </div>
            : <IncomeExpenseBars data={bars.data!} />}
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Répartition</div>
            <div className="card-sub">{monthName}</div>
          </div>
          {donutLoading
            ? <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '8px 0' }}>
                <div className="sk sk-block" style={{ width: 130, height: 130, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[70, 55, 45].map((w, i) => <div key={i} className="sk sk-text" style={{ width: `${w}%` }} />)}
                </div>
              </div>
            : donutSlices.length > 0
              ? <CategoryDonut slices={donutSlices} />
              : <div className="empty" style={{ padding: '28px 10px' }}>Aucune dépense ce mois-ci.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---- Date stepper (← 3 juin 2026 →) ---- */
function DateStepper({ value, min, max, onChange }: { value: string; min?: string; max?: string; onChange: (d: string) => void }) {
  const adjust = (days: number) => {
    const d = new Date(value + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    const next = d.toISOString().slice(0, 10);
    if (min && next < min) return;
    if (max && next > max) return;
    onChange(next);
  };
  const [y, m, d] = value.split('-').map(Number);
  return (
    <div className="date-stepper">
      <button className="date-step-btn" type="button" onClick={() => adjust(-1)} disabled={!!min && value <= min}>
        <ChevronLeft size={13} />
      </button>
      <span className="date-step-val">{d} {MONTHS_FULL[m - 1]} {y}</span>
      <button className="date-step-btn" type="button" onClick={() => adjust(1)} disabled={!!max && value >= max}>
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

/* ---- Transaction list ---- */
const TX_PAGE = 20;

function TransactionList({ account, accounts, members, categories, onEdit, onDelete, onTxContext, onConfirmForecast, onSkipForecast }: {
  account: Account; accounts: Account[]; members: Member[]; categories: Category[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onTxContext: (x: number, y: number, tx: Transaction) => void;
  onConfirmForecast: (f: ForecastItem, date?: string) => Promise<string>;
  onSkipForecast: (f: ForecastItem) => Promise<void>;
}) {
  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const memberMap = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [catFilter, setCatFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [limit, setLimit] = useState(TX_PAGE);
  // Clé composée `${recurrenceId}|${date}` — distingue le même récurrent sur plusieurs mois
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(new Set());
  const [skippingKey, setSkippingKey] = useState<string | null>(null);
  const [confirmSkipKey, setConfirmSkipKey] = useState<string | null>(null);
  // Date choisie pour chaque item en retard (clé = `${id}|${date}`)
  const [confirmDates, setConfirmDates] = useState<Record<string, string>>({});
  const [flashId, setFlashId] = useState<string | null>(null);
  const confirmingRef = useRef(false);

  const today = new Date().toISOString().slice(0, 10);
  const fKey = (f: ForecastItem) => `${f.id}|${f.date}`;

  const handleConfirm = async (f: ForecastItem) => {
    if (confirmingRef.current) return;
    const key = fKey(f);
    confirmingRef.current = true;
    setConfirmingKey(key);
    setConfirmedKeys(prev => new Set([...prev, key]));
    // Pour les items en retard, on passe la date choisie (défaut = date prévue)
    // Pour les items à venir, on ne passe rien (App utilisera f.date)
    const isOverdue = f.date <= today;
    const dateOverride = isOverdue ? (confirmDates[key] ?? f.date) : undefined;
    try {
      const newId = await onConfirmForecast(f, dateOverride);
      setFlashId(newId);
      setTimeout(() => setFlashId(null), 1800);
    } finally {
      confirmingRef.current = false;
      setConfirmingKey(null);
    }
  };

  const handleSkip = async (f: ForecastItem) => {
    if (skippingKey) return;
    const key = fKey(f);
    setSkippingKey(key);
    setConfirmedKeys(prev => new Set([...prev, key]));
    try { await onSkipForecast(f); } finally { setSkippingKey(null); }
  };

  const txQuery = useTransactions(account.id);
  const forecastQuery = useForecast(account.id);
  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  // Si un item revient dans le forecast (ex: undo), on le retire de confirmedKeys
  useEffect(() => {
    if (!forecastQuery.data) return;
    const backKeys = new Set(forecastQuery.data.map(fKey));
    setConfirmedKeys(prev => {
      const next = new Set(prev);
      for (const k of prev) if (backKeys.has(k)) next.delete(k);
      return next.size === prev.size ? prev : next;
    });
  }, [forecastQuery.data]);

  const txs = txQuery.data ?? [];
  const forecast = forecastQuery.data ?? [];

  const availableMonths = useMemo(() => {
    const months = [...new Set(txs.map(t => t.date.slice(0, 7)))];
    return months.sort((a, b) => b.localeCompare(a));
  }, [txs]);

  // Catégories présentes dans le mois sélectionné (ou toutes les transactions si pas de filtre mois)
  const catsInScope = useMemo(() => {
    const scope = monthFilter !== 'all' ? txs.filter(t => t.date.startsWith(monthFilter)) : txs;
    const ids = new Set(scope.map(t => t.categorieId).filter(Boolean));
    return categories.filter(c => ids.has(c.id));
  }, [categories, txs, monthFilter]);

  const hasActiveFilters = typeFilter !== 'all' || catFilter !== 'all' || monthFilter !== 'all' || q.trim() !== '';
  const resetFilters = () => { setTypeFilter('all'); setCatFilter('all'); setMonthFilter('all'); setQ(''); };

  const filtered = useMemo(() => {
    let result = txs;
    const s = q.trim().toLowerCase();
    if (s) result = result.filter(t => {
      const c = t.categorieId ? catMap[t.categorieId] : null;
      return (t.libelle ?? '').toLowerCase().includes(s) || (t.note ?? '').toLowerCase().includes(s) || (c && c.nom.toLowerCase().includes(s));
    });
    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);
    if (catFilter !== 'all') result = result.filter(t => t.categorieId === catFilter);
    if (monthFilter !== 'all') result = result.filter(t => t.date.startsWith(monthFilter));
    return result;
  }, [txs, q, typeFilter, catFilter, monthFilter, catMap]);

  const displayed = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const hasMore = filtered.length > limit;
  const remaining = filtered.length - limit;

  const groups = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    displayed.forEach(t => { (g[t.date] = g[t.date] || []).push(t); });
    return Object.keys(g).sort((a, b) => b.localeCompare(a)).map(date => ({ date, items: g[date] }));
  }, [displayed]);

  // Forecasts filtrés selon les filtres actifs ; cachés quand on parcourt un mois précis
  const visibleForecast = useMemo(() => {
    if (monthFilter !== 'all' || typeFilter === 'transfer') return [];
    let result = forecast.filter(f => !confirmedKeys.has(fKey(f)));
    if (typeFilter !== 'all') result = result.filter(f => f.sens === typeFilter);
    if (catFilter !== 'all') result = result.filter(f => f.categorieId === catFilter);
    return result;
  }, [forecast, typeFilter, catFilter, monthFilter, confirmedKeys]);

  const overdueItems = useMemo(() => visibleForecast.filter(f => f.date <= today), [visibleForecast, today]);
  const upcomingItems = useMemo(() => visibleForecast.filter(f => f.date > today), [visibleForecast, today]);



  return (
    <div className="tx-section">
      {/* Toolbar */}
      <div className="tx-toolbar">
        <h2>Transactions</h2>
        <span className="count">{hasActiveFilters ? `${filtered.length} / ${txs.length}` : txs.length}</span>
        <div className="tx-search">
          <Search size={15} />
          <input placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setQ('')}><X size={14} /></button>}
        </div>
      </div>

      {/* Filters */}
      <div className="tx-filters">
        <div className="seg">
          <button className={typeFilter === 'all' ? 'on' : ''} onClick={() => setTypeFilter('all')}>Tout</button>
          <button className={typeFilter === 'income' ? 'on' : ''} onClick={() => setTypeFilter('income')}>Entrées</button>
          <button className={typeFilter === 'expense' ? 'on' : ''} onClick={() => setTypeFilter('expense')}>Dépenses</button>
          <button className={typeFilter === 'transfer' ? 'on' : ''} onClick={() => setTypeFilter('transfer')}>Virements</button>
        </div>
        <select value={catsInScope.some(c => c.id === catFilter) ? catFilter : 'all'} onChange={e => setCatFilter(e.target.value)} className="filter-sel">
          <option value="all">Toutes catégories</option>
          {catsInScope.map(c =>
            <option key={c.id} value={c.id}>{c.nom}</option>
          )}
        </select>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="filter-sel">
          <option value="all">Tous les mois</option>
          {availableMonths.map(m => {
            const [y, mo] = m.split('-').map(Number);
            return <option key={m} value={m}>{MONTHS[mo - 1]} {y}</option>;
          })}
        </select>
        {hasActiveFilters && (
          <button className="btn ghost sm" onClick={resetFilters} style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <X size={13} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Récurrences en retard (non confirmées des jours/mois passés) */}
      {overdueItems.length > 0 && (
        <div className="forecast-block forecast-overdue">
          <div className="forecast-header">
            <CalendarClock size={13} /> En retard · {overdueItems.length} non confirmée{overdueItems.length > 1 ? 's' : ''}
          </div>
          <div className="tx-list">
            {overdueItems.map(f => {
              const key = fKey(f);
              const c = f.categorieId ? catMap[f.categorieId] : null;
              const IconComp = c ? (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
                c.icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
              ] : null;
              const [, fM, fD] = f.date.split('-').map(Number);
              const label = f.libelle || c?.nom || 'Prévu';
              const chosenDate = confirmDates[key] ?? f.date;
              return (
                <div className="tx-row projected overdue" key={key}>
                  <span className="tx-stamp">
                    <span className="tx-stamp-d">{fD}</span>
                    <span className="tx-stamp-m">{MONTHS[fM - 1]}</span>
                  </span>
                  <span className="tx-ico">{IconComp ? <IconComp size={17} /> : null}</span>
                  <div className="tx-body">
                    <div className="tx-label">{label}</div>
                    <div className="tx-meta">
                      <i className="cat-dot" style={{ background: c ? `oklch(0.6 0.12 ${c.hue})` : 'var(--text-3)' }} />
                      <span>{c?.nom ?? 'Divers'}</span>
                    </div>
                  </div>
                  <div className={`tx-amount ${f.sens === 'income' ? 'inc' : 'exp'}`} style={{ minWidth: 48, textAlign: 'right' }}>
                    {f.sens === 'income' ? '+' : '−'}{fmtEurShort(f.montant)}
                  </div>
                  <DateStepper
                    value={chosenDate}
                    max={today}
                    onChange={d => setConfirmDates(prev => ({ ...prev, [key]: d }))}
                  />
                  {confirmSkipKey === key ? (
                    <button className="btn ghost sm overdue-skip-btn overdue-skip-confirm"
                      disabled={!!confirmingKey || !!skippingKey}
                      onClick={() => { setConfirmSkipKey(null); handleSkip(f); }}>
                      <Ban size={13} /> Confirmer ?
                    </button>
                  ) : (
                    <button className="btn ghost sm overdue-skip-btn"
                      disabled={!!confirmingKey || !!skippingKey}
                      onClick={() => setConfirmSkipKey(key)}>
                      <Ban size={13} /> Passer
                    </button>
                  )}
                  <button className="btn-confirm" disabled={!!confirmingKey || !!skippingKey}
                    onClick={() => handleConfirm(f)}>
                    <Check size={14} /> {confirmingKey === key ? '…' : 'Confirmer'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Récurrences à venir ce mois-ci */}
      {upcomingItems.length > 0 && (
        <div className="forecast-block">
          <div className="forecast-header">
            <CalendarClock size={13} /> À venir ce mois-ci
          </div>
          <div className="tx-list">
            {upcomingItems.map(f => {
              const key = fKey(f);
              const c = f.categorieId ? catMap[f.categorieId] : null;
              const IconComp = c ? (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
                c.icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
              ] : null;
              const [, fM, fD] = f.date.split('-').map(Number);
              const label = f.libelle || c?.nom || 'Prévu';
              return (
                <div className="tx-row projected" key={key}>
                  <span className="tx-stamp">
                    <span className="tx-stamp-d">{fD}</span>
                    <span className="tx-stamp-m">{MONTHS[fM - 1]}</span>
                  </span>
                  <span className="tx-ico">{IconComp ? <IconComp size={17} /> : null}</span>
                  <div className="tx-body">
                    <div className="tx-label">{label}</div>
                    <div className="tx-meta">
                      <i className="cat-dot" style={{ background: c ? `oklch(0.6 0.12 ${c.hue})` : 'var(--text-3)' }} />
                      <span>{c?.nom ?? 'Divers'}</span>
                    </div>
                  </div>
                  <div className={`tx-amount ${f.sens === 'income' ? 'inc' : 'exp'}`} style={{ marginRight: 12 }}>
                    {f.sens === 'income' ? '+' : '−'}{fmtEurShort(f.montant)}
                  </div>
                  <button className="btn-confirm" disabled={!!confirmingKey} onClick={() => handleConfirm(f)}>
                    <Check size={14} /> {confirmingKey === key ? '…' : 'Confirmer'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skeleton loading */}
      {!txQuery.data && (
        <div className="tx-list" style={{ marginTop: 8 }}>
          {[1, 0.9, 0.75, 1, 0.6, 0.85].map((op, i) => (
            <div className="tx-row" key={i} style={{ opacity: op, pointerEvents: 'none' }}>
              <span className="tx-stamp">
                <div className="sk" style={{ width: 22, height: 18, borderRadius: 4, marginBottom: 3 }} />
                <div className="sk" style={{ width: 22, height: 11, borderRadius: 4 }} />
              </span>
              <span className="tx-ico sk" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
              <div className="tx-body" style={{ gap: 6 }}>
                <div className="sk sk-text" style={{ width: `${40 + (i * 17) % 40}%` }} />
                <div className="sk sk-text" style={{ width: `${25 + (i * 11) % 25}%`, height: 11 }} />
              </div>
              <div className="sk sk-text" style={{ width: 52, marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {txQuery.data && groups.length === 0 && (
        <div className="empty">
          <div className="e-ic"><span style={{ fontSize: 22 }}>🧾</span></div>
          {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune transaction pour le moment.'}
        </div>
      )}

      {/* Transaction groups — date inline en colonne gauche, sans header séparé */}
      {groups.map(grp => (
        <div key={grp.date} className="tx-group">
          <div className="tx-list">
            {grp.items.map((t, ti) => {
              const c = t.categorieId ? catMap[t.categorieId] : null;
              const isTr = t.type === 'transfer';
              const hue = c?.hue ?? 250;
              const IconComp = c ? (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
                c.icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
              ] : null;
              const [, txM, txD] = t.date.split('-').map(Number);
              return (
                <button className={`tx-row${t.id === flashId ? ' tx-flash' : ''}`} key={t.id} data-ctx-menu onClick={() => onEdit(t)} onContextMenu={e => { e.preventDefault(); onTxContext(e.clientX, e.clientY, t); }}>
                  {/* Date stamp — visible uniquement sur la 1re ligne du groupe */}
                  <span className={`tx-stamp${ti > 0 ? ' blank' : ''}`}>
                    <span className="tx-stamp-d">{txD}</span>
                    <span className="tx-stamp-m">{MONTHS[txM - 1]}</span>
                  </span>
                  <span className="tx-ico" style={{ background: `oklch(0.6 0.12 ${hue} / 0.13)`, color: `oklch(0.5 0.13 ${hue})`, position: 'relative' }}>
                    {IconComp ? <IconComp size={17} /> : (isTr ? <ArrowLeftRight size={17} /> : null)}
                    {isTr && (
                      <span className="tx-ico-badge">
                        <ArrowLeftRight size={10} />
                      </span>
                    )}
                  </span>
                  <div className="tx-body">
                    <div className="tx-label">{t.libelle || (c ? c.nom : (isTr ? 'Virement' : 'Opération'))}</div>
                    <div className="tx-meta">
                      {isTr ? (() => {
                        const linkedAcc = t.linkedAccountId ? accountMap[t.linkedAccountId] : null;
                        const linkedMember = linkedAcc ? memberMap[linkedAcc.memberId] : null;
                        const arrow = t.dir === 'in' ? '←' : '→';
                        const label = linkedAcc
                          ? `${arrow} ${linkedMember ? linkedMember.nom + ' · ' : ''}${linkedAcc.nom}`
                          : `Virement ${t.dir === 'in' ? 'reçu' : 'émis'}`;
                        return <>
                          {c && <><i className="cat-dot" style={{ background: `oklch(0.6 0.12 ${hue})` }} /><span>{c.nom}</span><span className="tx-meta-sep">·</span></>}
                          <span>{label}</span>
                          {t.note && <><span className="tx-meta-sep">·</span><span className="tx-meta-note">{t.note}</span></>}
                        </>;
                      })()
                        : <><i className="cat-dot" style={{ background: `oklch(0.6 0.12 ${hue})` }} /><span>{c?.nom ?? 'Divers'}</span>{t.note && <><span className="tx-meta-sep">·</span><span className="tx-meta-note">{t.note}</span></>}{t.receiptPath && <><span className="tx-meta-sep">·</span><Paperclip size={11} style={{ flexShrink: 0, opacity: 0.6 }} /></>}</>}
                    </div>
                  </div>
                  <span className={`tx-amount ${t.type === 'income' ? 'inc' : isTr ? '' : 'exp'}`}
                    style={isTr ? { color: t.dir === 'in' ? 'var(--pos)' : 'var(--text-2)' } : {}}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : (t.dir === 'in' ? '+' : '−')}{fmtEur(t.montant)}
                  </span>
                  {t.recurrenceId && (
                    <button
                      className="tx-cancel-rec"
                      title="Annuler — remet dans À venir"
                      onClick={e => { e.stopPropagation(); onDelete(t); }}
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                  {!t.recurrenceId && <span className="tx-edit-hint"><LucideIcons.ChevronRight size={16} /></span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Voir plus / Voir moins */}
      {(hasMore || limit > TX_PAGE) && (
        <div className="tx-more-row">
          {limit > TX_PAGE && (
            <button
              className="btn ghost sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setLimit(TX_PAGE)}
            >
              Voir moins
            </button>
          )}
          {hasMore && (
            <button
              className="btn ghost sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setLimit(l => l + TX_PAGE)}
            >
              Voir plus · {remaining} de plus
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Recurrences section ---- */
function RecurrencesSection({ account, categories }: { account: Account; categories: Category[] }) {
  const [modal, setModal] = useState<'create' | Recurrence | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const dragId = useRef<string | null>(null);
  const recQ = useRecurrences(account.id);
  const createRec = useCreateRecurrence();
  const updateRec = useUpdateRecurrence();
  const deleteRec = useDeleteRecurrence();
  const reorder = useReorderRecurrences();

  const serverRecs = recQ.data ?? [];
  // Ordre local optimiste pendant le drag ; retombe sur l'ordre serveur sinon
  const recs = useMemo(() => {
    if (!localOrder) return serverRecs;
    const map = Object.fromEntries(serverRecs.map(r => [r.id, r]));
    return localOrder.map(id => map[id]).filter(Boolean) as Recurrence[];
  }, [serverRecs, localOrder]);

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  const handleCreate = async (data: Omit<Recurrence, 'id'>) => {
    await createRec.mutateAsync(data);
    setModal(null);
  };
  const handleUpdate = async (id: string, data: Omit<Recurrence, 'id'>) => {
    await updateRec.mutateAsync({ id, data });
    setModal(null);
  };
  const handleDelete = async (id: string) => {
    await deleteRec.mutateAsync(id);
    setModal(null);
  };

  // Drag handlers
  const onDragStart = (id: string) => { dragId.current = id; };
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === overId) return;
    const base = localOrder ?? serverRecs.map(r => r.id);
    const from = base.indexOf(dragId.current);
    const to = base.indexOf(overId);
    if (from === -1 || to === -1) return;
    const next = [...base];
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    setLocalOrder(next);
  };
  const onDrop = () => {
    if (localOrder) reorder.mutate(localOrder);
  };
  const onDragEnd = () => { dragId.current = null; };

  return (
    <div className="tx-section" style={{ marginTop: 8 }}>
      <div className="tx-toolbar">
        <RefreshCw size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <h2>Récurrences</h2>
        <span className="count">{recs.length}</span>
        <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('create')}>
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {recs.length === 0 ? (
        <div className="empty">
          <div className="e-ic"><RefreshCw size={20} style={{ color: 'var(--text-3)' }} /></div>
          Aucune récurrence — ajoutez vos revenus et dépenses fixes.
        </div>
      ) : (
        <div className="tx-list">
          {recs.map(r => {
            const c = r.categorieId ? catMap[r.categorieId] : null;
            const hue = c?.hue ?? 250;
            const IconComp = c
              ? (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
                  c.icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
                ]
              : null;
            return (
              <div key={r.id} className="tx-row rec-row"
                draggable
                onDragStart={() => onDragStart(r.id)}
                onDragOver={e => onDragOver(e, r.id)}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              >
                <span className="rec-grip"><GripVertical size={15} /></span>
                <span className="tx-ico" style={{ background: `oklch(0.6 0.12 ${hue} / 0.13)`, color: `oklch(0.5 0.13 ${hue})` }}>
                  {IconComp ? <IconComp size={17} /> : <RefreshCw size={17} />}
                </span>
                <button className="tx-body rec-body-btn" onClick={() => setModal(r)}>
                  <div className="tx-label">{r.libelle || c?.nom || 'Récurrence'}</div>
                  <div className="tx-meta">
                    <i className="cat-dot" style={{ background: `oklch(0.6 0.12 ${hue})` }} />
                    <span>{c?.nom ?? 'Divers'} · le {r.jourDuMois} du mois</span>
                  </div>
                </button>
                <span className={`tx-amount ${r.sens === 'income' ? 'inc' : 'exp'}`}>
                  {r.sens === 'income' ? '+' : '−'}{fmtEur(r.montant)}
                </span>
                <span className="tx-edit-hint"><LucideIcons.ChevronRight size={16} /></span>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <RecurrenceFormModal
          recurrence={modal === 'create' ? undefined : modal}
          accountId={account.id}
          categories={categories}
          isPending={createRec.isPending || updateRec.isPending || deleteRec.isPending}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

/* ---- Imports section ---- */
const BANK_LABELS: Record<string, string> = { ca: 'Crédit Agricole', ce: 'Caisse d\'Épargne', bnp: 'BNP Paribas' };

function ImportsSection({ account }: { account: Account }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const importsQ = useImports(account.id);
  const deleteImport = useDeleteImport();

  const imports = (importsQ.data ?? []).slice().sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  if (imports.length === 0) return null;

  return (
    <div className="tx-section" style={{ marginTop: 8 }}>
      <div className="tx-toolbar">
        <FileText size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <h2>Relevés importés</h2>
        <span className="count">{imports.length}</span>
      </div>
      <div className="tx-list">
        {imports.map((imp: BankImport) => (
          <div key={imp.id}>
            <div className="tx-row" style={{ cursor: 'default' }}>
              <span className="tx-ico" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                <FileText size={17} />
              </span>
              <button className="tx-body rec-body-btn" onClick={() => setExpanded(expanded === imp.id ? null : imp.id)}>
                <div className="tx-label">{imp.filename}</div>
                <div className="tx-meta">
                  <span>{BANK_LABELS[imp.bankName] ?? imp.bankName}</span>
                  <span className="tx-meta-sep">·</span>
                  <span>{imp.transactionCount} opérations</span>
                  <span className="tx-meta-sep">·</span>
                  <span>importé le {imp.importedAt.split('-').reverse().join('/')}</span>
                </div>
              </button>
              {confirmDel === imp.id ? (
                <button className="btn danger sm" style={{ background: 'var(--neg)', color: '#fff', borderColor: 'transparent', flexShrink: 0 }}
                  disabled={deleteImport.isPending}
                  onClick={() => deleteImport.mutate({ id: imp.id, accountId: account.id }, { onSuccess: () => setConfirmDel(null) })}>
                  {deleteImport.isPending ? <Loader2 size={13} className="spin" /> : 'Confirmer'}
                </button>
              ) : (
                <button className="btn ghost sm" style={{ flexShrink: 0 }} onClick={() => setConfirmDel(imp.id)}>
                  <Trash2 size={13} /> Annuler
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
