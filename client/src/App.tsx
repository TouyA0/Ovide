import { useEffect, useState } from 'react';
import {
  Plus, MousePointer2, PenLine, Columns2, Download, Archive,
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
import { Modal } from './components/modals/Modal';
import { Toasts, useToasts } from './components/ui/Toast';
import { useLayout } from './store/useLayout';
import {
  useMembers, useAccounts, useCategories,
  useCreateTransaction, useUpdateTransaction, useDeleteTransaction,
  useCreateTransfer, useTogglePrevisions, useCreateAccount, useUpdateAccount,
  useArchiveAccount, useCreateMember,
} from './hooks/useData';
import type { Transaction, ForecastItem } from './api/client';

type ModalState =
  | { kind: 'add'; accId: string }
  | { kind: 'transfer'; accId: string }
  | { kind: 'edit'; tx: Transaction }
  | { kind: 'account'; memberId?: string }
  | { kind: 'edit-account'; accId: string }
  | { kind: 'archive-account'; accId: string }
  | { kind: 'member' }
  | null;

type CtxState = { x: number; y: number; accId: string } | null;

export default function App() {
  const layout = useLayout();
  const initTabs = useLayout(s => s.initTabs);
  const tabsLength = useLayout(s => s.tabs.length);
  const { items: toasts, push: pushToast } = useToasts();
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxState>(null);

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
    await createTx.mutateAsync({ accountId: f.accountId, type: f.sens as 'income' | 'expense', montant: f.montant, categorieId: f.categorieId ?? undefined, libelle: f.libelle, date: f.date, note: '' });
    pushToast(`${f.libelle} confirmé`);
  };

  const handleTogglePrev = async (id: string) => {
    await togglePrev.mutateAsync(id);
    pushToast('Prévisions mises à jour', 'info');
  };

  const handleCreateAccount = async (data: Parameters<typeof createAccount.mutateAsync>[0]) => {
    const { id } = await createAccount.mutateAsync(data);
    pushToast('Compte créé');
    layout.openInNewTab(id);
    setModal(null);
  };

  const handleEditAccount = async (accId: string, data: { nom: string; type: 'courant' | 'epargne' | 'autre' }) => {
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

  return (
    <div className="app-shell">
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
          onAddAccount={(memberId) => setModal({ kind: 'account', memberId })}
          onAddMember={() => setModal({ kind: 'member' })}
        />
        <div className="main">
          <div className="panes">
            {activePaneProps && (
              <AccountPane
                key={layout.activeId!}
                {...activePaneProps}
                onAdd={() => setModal({ kind: 'add', accId: layout.activeId! })}
                onTransfer={() => setModal({ kind: 'transfer', accId: layout.activeId! })}
                onExport={() => handleExport(layout.activeId!)}
                onEdit={tx => setModal({ kind: 'edit', tx })}
                onConfirmForecast={handleConfirmForecast}
                onTogglePrevisions={() => handleTogglePrev(layout.activeId!)}
              />
            )}
            {layout.splitOn && splitPaneProps && layout.splitId !== layout.activeId && (
              <AccountPane
                key={'s' + layout.splitId}
                {...splitPaneProps}
                isSplitTarget
                onAdd={() => setModal({ kind: 'add', accId: layout.splitId! })}
                onTransfer={() => setModal({ kind: 'transfer', accId: layout.splitId! })}
                onExport={() => handleExport(layout.splitId!)}
                onEdit={tx => setModal({ kind: 'edit', tx })}
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
          defaultAccountId={modal.accId} onClose={() => setModal(null)} onSave={handleAddTx} />
      )}
      {modal?.kind === 'transfer' && (
        <TransferModal accounts={accounts} members={members} defaultFromId={modal.accId}
          onClose={() => setModal(null)} onSave={handleTransfer} />
      )}
      {modal?.kind === 'edit' && (
        <EditTransactionModal tx={modal.tx} categories={categories} accounts={accounts} members={members}
          onClose={() => setModal(null)} onSave={handleSaveTx} onDelete={handleDeleteTx} />
      )}
      {modal?.kind === 'account' && (
        <AccountFormModal members={members} defaultMemberId={modal.memberId}
          onClose={() => setModal(null)} onSave={handleCreateAccount} />
      )}
      {modal?.kind === 'edit-account' && editTargetAccount && (
        <AccountEditModal
          account={editTargetAccount}
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
            <button className="btn ghost" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn danger" onClick={() => handleArchiveAccount(modal.accId)}>
              <Archive size={15} /> Archiver
            </button>
          </div>
        </Modal>
      )}
      {modal?.kind === 'member' && (
        <MemberFormModal onClose={() => setModal(null)} onSave={handleCreateMember} />
      )}

      {/* Context menu */}
      {ctx && (() => {
        const a = accounts.find(x => x.id === ctx.accId);
        const m = members.find(x => x.id === a?.memberId);
        if (!a || !m) return null;
        return <ContextMenu ctx={ctx} account={a} member={m} actions={ctxActions(ctx.accId)} onClose={() => setCtx(null)} />;
      })()}

      <Toasts items={toasts} />
    </div>
  );
}
