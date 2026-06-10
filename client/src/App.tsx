import { useEffect, useState } from 'react';
import {
  Plus, MousePointer2, PenLine, Columns2, Download, Archive, Loader2,
  Sun, Moon, WalletMinimal, Tags, Receipt, BarChart2, Settings,
} from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { ContextMenu } from './components/layout/ContextMenu';
import { AccountPane } from './components/account/AccountPane';
import { AddTransactionModal } from './components/modals/AddTransaction';
import { TransferModal } from './components/modals/Transfer';
import { EditTransactionModal } from './components/modals/EditTransaction';
import { AccountFormModal } from './components/modals/AccountForm';
import { AccountEditModal } from './components/modals/AccountEditModal';
import { MemberFormModal } from './components/modals/MemberForm';
import { CategoriesModal } from './components/modals/CategoriesModal';
import { Modal } from './components/modals/Modal';
import { Toasts, useToastStore } from './components/ui/Toast';
import { useLayout } from './store/useLayout';
import {
  useMembers, useAccounts, useCategories,
  useCreateTransaction, useUpdateTransaction, useDeleteTransaction,
  useCreateTransfer, useTogglePrevisions, useCreateAccount, useUpdateAccount,
  useArchiveAccount, useCreateMember, useUpdateMember,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
} from './hooks/useData';
import type { Transaction, ForecastItem, Member } from './api/client';

type ModalState =
  | { kind: 'add'; accId: string }
  | { kind: 'transfer'; accId: string }
  | { kind: 'edit'; tx: Transaction }
  | { kind: 'account'; memberId?: string }
  | { kind: 'edit-account'; accId: string }
  | { kind: 'archive-account'; accId: string }
  | { kind: 'member' }
  | { kind: 'edit-member'; member: Member }
  | { kind: 'categories' }
  | null;

type CtxState = { x: number; y: number; accId: string } | null;
type MemberCtxState = { x: number; y: number; member: Member } | null;

export default function App() {
  const layout = useLayout();
  const initTabs = useLayout(s => s.initTabs);
  const tabsLength = useLayout(s => s.tabs.length);
  const pushToast = useToastStore(s => s.push);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxState>(null);
  const [memberCtx, setMemberCtx] = useState<MemberCtxState>(null);
  const [mobileSection, setMobileSection] = useState<'transactions' | 'stats'>('transactions');

  // Data
  const membersQ = useMembers();
  const accountsQ = useAccounts();
  const categoriesQ = useCategories();

  const members = membersQ.data ?? [];
  const accounts = accountsQ.data ?? [];
  const categories = categoriesQ.data ?? [];

  // Init theme + tabs on first load
  useEffect(() => {
    const saved = localStorage.getItem('foyer-theme') ?? 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    if (accounts.length && tabsLength === 0) {
      initTabs(accounts.slice(0, 2).map(a => a.id));
    }
  }, [accounts, tabsLength, initTabs]);

  // Mutations
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();
  const createTransfer = useCreateTransfer();
  const togglePrev = useTogglePrevisions();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const archiveAccount = useArchiveAccount();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const handleAddTx = async (data: Parameters<typeof createTx.mutateAsync>[0]) => {
    await createTx.mutateAsync(data);
    pushToast(`${data.type === 'income' ? 'Entrée' : 'Dépense'} ajoutée`);
    setModal(null);
  };

  const handleSaveTx = async (tx: Transaction) => {
    await updateTx.mutateAsync({ id: tx.id, data: tx });
    pushToast('Opération mise à jour');
    setModal(null);
  };

  const handleDeleteTx = async (tx: Transaction) => {
    await deleteTx.mutateAsync(tx.id);
    pushToast('Opération supprimée', 'trash-2');
    setModal(null);
  };

  const handleTransfer = async (data: Parameters<typeof createTransfer.mutateAsync>[0]) => {
    await createTransfer.mutateAsync(data);
    pushToast('Virement effectué');
    setModal(null);
  };

  const handleConfirmForecast = async (f: ForecastItem) => {
    const { id } = await createTx.mutateAsync({ accountId: f.accountId, type: f.sens as 'income' | 'expense', montant: f.montant, categorieId: f.categorieId ?? undefined, libelle: f.libelle, date: f.date, note: '', recurrenceId: f.id });
    pushToast(`${f.libelle || 'Opération'} confirmée`, 'check-circle-2', {
      label: 'Annuler',
      fn: () => deleteTx.mutateAsync(id),
    });
  };

  const handleTogglePrev = async (id: string) => {
    await togglePrev.mutateAsync(id);
  };

  const handleCreateAccount = async (data: Parameters<typeof createAccount.mutateAsync>[0]) => {
    const { id } = await createAccount.mutateAsync(data);
    pushToast('Compte créé');
    layout.openInNewTab(id);
    setModal(null);
  };

  const handleEditAccount = async (accId: string, data: { nom: string; type: 'courant' | 'epargne' | 'autre'; banque: string | null }) => {
    await updateAccount.mutateAsync({ id: accId, data });
    pushToast('Compte mis à jour');
    setModal(null);
  };

  const handleArchiveAccount = async (accId: string) => {
    await archiveAccount.mutateAsync({ id: accId, archive: true });
    layout.closeTab(accId);
    pushToast('Compte archivé', 'archive');
    setModal(null);
  };

  const handleUnarchiveAccount = async (accId: string) => {
    await archiveAccount.mutateAsync({ id: accId, archive: false });
    pushToast('Compte remis en actif');
  };

  const handleCreateMember = async (data: Parameters<typeof createMember.mutateAsync>[0]) => {
    await createMember.mutateAsync(data);
    pushToast('Membre ajouté');
    setModal(null);
  };

  const handleEditMember = async (id: string, data: Parameters<typeof updateMember.mutateAsync>[0]['data']) => {
    await updateMember.mutateAsync({ id, data });
    pushToast('Membre mis à jour');
    setModal(null);
  };

  const handleCreateCategory = async (data: Parameters<typeof createCategory.mutateAsync>[0]) => {
    await createCategory.mutateAsync(data);
    pushToast('Catégorie créée');
  };

  const handleUpdateCategory = async (id: string, data: Parameters<typeof updateCategory.mutateAsync>[0]['data']) => {
    await updateCategory.mutateAsync({ id, data });
    pushToast('Catégorie mise à jour');
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory.mutateAsync(id);
    pushToast('Catégorie supprimée', 'trash-2');
  };

  const handleExport = (accId: string) => {
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      window.location.href = `/api/export/${accId}/csv`;
      pushToast('Export CSV téléchargé', 'download');
    }
  };

  const ctxActions = (accId: string) => {
    const acc = accounts.find(a => a.id === accId);
    const isArchived = acc?.archive ?? false;
    return [
      ...(!isArchived ? [
        { icon: <MousePointer2 size={16} />, label: 'Ouvrir', fn: () => layout.openTab(accId) },
        { icon: <Plus size={16} />, label: 'Ouvrir dans un nouvel onglet', fn: () => layout.openInNewTab(accId) },
        { icon: <Columns2 size={16} />, label: 'Ouvrir dans la vue scindée', fn: () => layout.openInSplit(accId) },
        { sep: true },
      ] : []),
      { icon: <Download size={16} />, label: 'Exporter en CSV', fn: () => handleExport(accId) },
      ...(!isArchived ? [
        { icon: <PenLine size={16} />, label: 'Renommer', fn: () => setModal({ kind: 'edit-account' as const, accId }) },
      ] : []),
      { sep: true },
      isArchived
        ? { icon: <Archive size={16} />, label: 'Désarchiver le compte', fn: () => handleUnarchiveAccount(accId) }
        : { icon: <Archive size={16} />, label: 'Archiver le compte', danger: true, fn: () => setModal({ kind: 'archive-account' as const, accId }) },
    ];
  };

  const newTab = () => {
    const notOpen = accounts.find(a => !layout.tabs.includes(a.id) && !a.archive);
    if (notOpen) layout.openInNewTab(notOpen.id);
    else pushToast('Tous les comptes sont déjà ouverts', 'info');
  };

  const activeAccount = accounts.find(a => a.id === layout.activeId);
  const splitAccount = accounts.find(a => a.id === layout.splitId);

  const paneProps = (acc: typeof activeAccount) => {
    if (!acc) return null;
    const member = members.find(m => m.id === acc.memberId);
    if (!member) return null;
    return { account: acc, member, categories };
  };

  if (membersQ.isLoading || accountsQ.isLoading) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
        Chargement…
      </div>
    );
  }

  const activePaneProps = paneProps(activeAccount);
  const splitPaneProps = paneProps(splitAccount);

  // Compte ciblé par les modals d'édition / archivage
  const editTargetAccount = modal?.kind === 'edit-account' || modal?.kind === 'archive-account'
    ? accounts.find(a => a.id === modal.accId)
    : null;

  // Réinitialise la section mobile quand on change de compte actif
  const activeId = layout.activeId;

  return (
    <div className="app-shell">

      {/* ── Chrome mobile (caché sur desktop via CSS container query) ── */}
      <div className="m-topbar">
        <div className="brand-mark" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }}>
          <WalletMinimal size={14} />
        </div>
        <span className="m-title" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeAccount?.nom ?? 'Foyer'}
        </span>
        <button className="icon-btn" onClick={layout.toggleTheme} title="Thème clair/sombre">
          {layout.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn" onClick={() => setModal({ kind: 'categories' })} title="Catégories">
          <Tags size={18} />
        </button>
      </div>

      <div className="m-switcher">
        {accounts.filter(a => !a.archive).map(a => {
          const m = members.find(mm => mm.id === a.memberId);
          const isActive = a.id === activeId;
          return (
            <button
              key={a.id}
              className={`m-pill${isActive ? ' on' : ''}`}
              onClick={() => { layout.openTab(a.id); setMobileSection('transactions'); }}
            >
              <i className="account-dot" style={{ background: isActive ? 'currentColor' : `var(--m-${m?.couleur ?? 'q'})` }} />
              {a.nom}
            </button>
          );
        })}
      </div>

      <TabBar
        tabs={layout.tabs} accounts={accounts} members={members} activeId={layout.activeId}
        splitOn={layout.splitOn} theme={layout.theme}
        onSelect={layout.setActive} onClose={layout.closeTab} onNewTab={newTab}
        onToggleSplit={() => layout.toggleSplit(accounts.find(a => a.id !== layout.activeId)?.id)}
        onToggleTheme={layout.toggleTheme}
        onInstall={() => pushToast("Application installée sur l'écran d'accueil")}
      />

      <div className="layout">
        <Sidebar
          members={members} accounts={accounts} activeId={layout.activeId}
          onOpen={layout.openTab}
          onContext={(x, y, accId) => setCtx({ x, y, accId })}
          onMemberContext={(x, y, m) => setMemberCtx({ x, y, member: m })}
          onAddAccount={(memberId) => setModal({ kind: 'account', memberId })}
          onAddMember={() => setModal({ kind: 'member' })}
          onOpenCategories={() => setModal({ kind: 'categories' })}
        />
        <div className="main">
          <div className="panes">
            {activePaneProps && (
              <AccountPane
                key={layout.activeId!}
                {...activePaneProps}
                mobileSection={mobileSection}
                onAdd={() => setModal({ kind: 'add', accId: layout.activeId! })}
                onTransfer={() => setModal({ kind: 'transfer', accId: layout.activeId! })}
                onExport={() => handleExport(layout.activeId!)}
                onEdit={tx => setModal({ kind: 'edit', tx })}
                onDelete={handleDeleteTx}
                onConfirmForecast={handleConfirmForecast}
                onTogglePrevisions={() => handleTogglePrev(layout.activeId!)}
              />
            )}
            {layout.splitOn && splitPaneProps && layout.splitId !== layout.activeId && (
              <AccountPane
                key={'s' + layout.splitId}
                {...splitPaneProps}
                isSplitTarget
                mobileSection={mobileSection}
                onAdd={() => setModal({ kind: 'add', accId: layout.splitId! })}
                onTransfer={() => setModal({ kind: 'transfer', accId: layout.splitId! })}
                onExport={() => handleExport(layout.splitId!)}
                onEdit={tx => setModal({ kind: 'edit', tx })}
                onDelete={handleDeleteTx}
                onConfirmForecast={handleConfirmForecast}
                onTogglePrevisions={() => handleTogglePrev(layout.splitId!)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {modal?.kind === 'add' && (
        <AddTransactionModal accounts={accounts} members={members} categories={categories}
          defaultAccountId={modal.accId} isPending={createTx.isPending}
          onClose={() => setModal(null)} onSave={handleAddTx} />
      )}
      {modal?.kind === 'transfer' && (
        <TransferModal accounts={accounts} members={members} defaultFromId={modal.accId}
          isPending={createTransfer.isPending}
          onClose={() => setModal(null)} onSave={handleTransfer} />
      )}
      {modal?.kind === 'edit' && (
        <EditTransactionModal tx={modal.tx} categories={categories} accounts={accounts} members={members}
          isPending={updateTx.isPending || deleteTx.isPending}
          onClose={() => setModal(null)} onSave={handleSaveTx} onDelete={handleDeleteTx} />
      )}
      {modal?.kind === 'account' && (
        <AccountFormModal members={members} defaultMemberId={modal.memberId}
          isPending={createAccount.isPending}
          onClose={() => setModal(null)} onSave={handleCreateAccount} />
      )}
      {modal?.kind === 'edit-account' && editTargetAccount && (
        <AccountEditModal
          account={editTargetAccount}
          isPending={updateAccount.isPending}
          onClose={() => setModal(null)}
          onSave={data => handleEditAccount(modal.accId, data)}
        />
      )}
      {modal?.kind === 'archive-account' && editTargetAccount && (
        <Modal title="Archiver le compte" onClose={() => setModal(null)}>
          <div className="modal-body">
            <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
              Archiver <strong>{editTargetAccount.nom}</strong> ? Le compte n'apparaîtra
              plus dans la sidebar et ne pourra plus recevoir de nouvelles transactions.
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 8 }}>
              Les transactions existantes restent accessibles via l'export CSV.
            </p>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setModal(null)} disabled={archiveAccount.isPending}>Annuler</button>
            <button className="btn danger" disabled={archiveAccount.isPending} onClick={() => handleArchiveAccount(modal.accId)}>
              {archiveAccount.isPending ? <Loader2 size={15} className="spin" /> : <><Archive size={15} /> Archiver</>}
            </button>
          </div>
        </Modal>
      )}
      {modal?.kind === 'categories' && (
        <CategoriesModal
          categories={categories}
          isPending={createCategory.isPending || updateCategory.isPending || deleteCategory.isPending}
          onClose={() => setModal(null)}
          onCreate={handleCreateCategory}
          onUpdate={handleUpdateCategory}
          onDelete={handleDeleteCategory}
        />
      )}
      {modal?.kind === 'member' && (
        <MemberFormModal isPending={createMember.isPending}
          onClose={() => setModal(null)} onSave={handleCreateMember} />
      )}
      {modal?.kind === 'edit-member' && (
        <MemberFormModal
          member={modal.member}
          isPending={updateMember.isPending}
          onClose={() => setModal(null)}
          onSave={data => handleEditMember(modal.member.id, data)}
        />
      )}

      {/* Context menu — compte */}
      {ctx && (() => {
        const a = accounts.find(x => x.id === ctx.accId);
        const m = members.find(x => x.id === a?.memberId);
        if (!a || !m) return null;
        return (
          <ContextMenu
            ctx={ctx}
            header={{
              title: a.nom,
              subtitle: m.nom + (a.banque ? ` · ${a.banque}` : ''),
              color: `var(--m-${m.couleur})`,
              initiales: m.initiales,
            }}
            actions={ctxActions(ctx.accId)}
            onClose={() => setCtx(null)}
          />
        );
      })()}

      {/* Context menu — membre */}
      {memberCtx && (() => {
        const m = memberCtx.member;
        const totalAcc = accounts.filter(a => a.memberId === m.id && !a.archive).length;
        return (
          <ContextMenu
            ctx={memberCtx}
            header={{
              title: m.nom,
              subtitle: `${totalAcc} compte${totalAcc > 1 ? 's' : ''}`,
              color: `var(--m-${m.couleur})`,
              initiales: m.initiales,
            }}
            actions={[
              { icon: <PenLine size={16} />, label: 'Modifier', fn: () => setModal({ kind: 'edit-member', member: m }) },
            ]}
            onClose={() => setMemberCtx(null)}
          />
        );
      })()}

      {/* ── FAB mobile ── */}
      {activeId && (
        <button
          className="fab"
          onClick={() => setModal({ kind: 'add', accId: activeId })}
          title="Ajouter une opération"
        >
          <Plus size={26} strokeWidth={2.2} />
        </button>
      )}

      {/* ── Bottom bar mobile ── */}
      <div className="m-bottombar">
        <button
          className={`m-tab${mobileSection === 'transactions' ? ' on' : ''}`}
          onClick={() => setMobileSection('transactions')}
        >
          <Receipt size={20} />
          Opérations
        </button>
        <button
          className={`m-tab${mobileSection === 'stats' ? ' on' : ''}`}
          onClick={() => setMobileSection('stats')}
        >
          <BarChart2 size={20} />
          Stats
        </button>
        <button
          className="m-tab"
          onClick={() => setModal({ kind: 'categories' })}
        >
          <Settings size={20} />
          Paramètres
        </button>
      </div>

      <Toasts />
    </div>
  );
}
