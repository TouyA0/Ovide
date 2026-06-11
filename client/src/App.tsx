import { useEffect, useState } from 'react';
import {
  Plus, MousePointer2, PenLine, Columns2, Download, Archive, Loader2,
  Sun, Moon, WalletMinimal, Tags, Receipt, BarChart2, Settings,
  Copy, Trash2,
} from 'lucide-react';
import { fmtEur } from './utils/format';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { ContextMenu } from './components/layout/ContextMenu';
import { AccountPane } from './components/account/AccountPane';
import { DashboardPane } from './components/dashboard/DashboardPane';
import { AddTransactionModal } from './components/modals/AddTransaction';
import { TransferModal } from './components/modals/Transfer';
import { EditTransactionModal } from './components/modals/EditTransaction';
import { AccountFormModal } from './components/modals/AccountForm';
import { ImportModal } from './components/modals/ImportModal';
import { AccountEditModal } from './components/modals/AccountEditModal';
import { MemberFormModal } from './components/modals/MemberForm';
import { CategoriesModal } from './components/modals/CategoriesModal';
import { Modal } from './components/modals/Modal';
import { Toasts, useToastStore } from './components/ui/Toast';
import { useLayout } from './store/useLayout';
import {
  useMembers, useAccounts, useCategories,
  useCreateTransaction, useUpdateTransaction, useDeleteTransaction,
  useCreateTransfer, useTogglePrevisions, useCreateAccount, useUpdateAccount, useCreateImport,
  useArchiveAccount, useCreateMember, useUpdateMember, useDeleteMember,
  useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories,
  useSkipRecurrence, useUnskipRecurrence, useDeleteAccount,
} from './hooks/useData';
import { api } from './api/client';
import type { Transaction, ForecastItem, Member } from './api/client';

type ModalState =
  | { kind: 'add'; accId: string }
  | { kind: 'transfer'; accId: string }
  | { kind: 'edit'; tx: Transaction }
  | { kind: 'account'; memberId: string }
  | { kind: 'edit-account'; accId: string }
  | { kind: 'archive-account'; accId: string }
  | { kind: 'member' }
  | { kind: 'edit-member'; member: Member }
  | { kind: 'categories' }
  | { kind: 'import'; accId: string }
  | { kind: 'confirm-delete-tx'; tx: Transaction }
  | { kind: 'delete-account'; accId: string }
  | null;

type CtxState = { x: number; y: number; accId: string } | null;
type MemberCtxState = { x: number; y: number; member: Member } | null;
type TxCtxState = { x: number; y: number; tx: Transaction } | null;

export default function App() {
  const layout = useLayout();
  const initTabs = useLayout(s => s.initTabs);
  const tabsLength = useLayout(s => s.tabs.length);
  const pushToast = useToastStore(s => s.push);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxState>(null);
  const [memberCtx, setMemberCtx] = useState<MemberCtxState>(null);
  const [txCtx, setTxCtx] = useState<TxCtxState>(null);
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
  const createImport = useCreateImport();
  const updateAccount = useUpdateAccount();
  const archiveAccount = useArchiveAccount();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();
  const skipRecurrence = useSkipRecurrence();
  const unskipRecurrence = useUnskipRecurrence();
  const deleteAccount = useDeleteAccount();

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
    if (tx.type === 'transfer' && tx.transferId) {
      const otherLeg = tx.linkedAccountId
        ? (await api.getTransactions(tx.linkedAccountId)).find(t => t.transferId === tx.transferId)
        : undefined;
      const outLeg = tx.dir === 'out' ? tx : otherLeg;
      const inLeg = tx.dir === 'in' ? tx : otherLeg;
      await deleteTx.mutateAsync(tx.id);
      pushToast('Virement supprimé', 'trash-2', outLeg && inLeg ? {
        label: 'Annuler',
        fn: async () => {
          await createTransfer.mutateAsync({
            fromId: outLeg.accountId, toId: inLeg.accountId, montant: tx.montant, date: tx.date,
            libelle: tx.libelle, note: tx.note, categorieId: outLeg.categorieId, categorieIdDest: inLeg.categorieId,
          });
          pushToast('Virement restauré');
        },
      } : undefined);
    } else {
      const restore = { accountId: tx.accountId, type: tx.type as 'income' | 'expense', montant: tx.montant, categorieId: tx.categorieId ?? undefined, libelle: tx.libelle, date: tx.date, note: tx.note };
      await deleteTx.mutateAsync(tx.id);
      pushToast('Opération supprimée', 'trash-2', {
        label: 'Annuler',
        fn: async () => {
          await createTx.mutateAsync(restore);
          pushToast('Opération restaurée');
        },
      });
    }
    setModal(null);
  };

  const handleDuplicateTx = async (tx: Transaction) => {
    await createTx.mutateAsync({
      accountId: tx.accountId,
      type: tx.type as 'income' | 'expense',
      montant: tx.montant,
      categorieId: tx.categorieId ?? undefined,
      libelle: tx.libelle,
      date: tx.date,
      note: tx.note,
    });
    pushToast('Opération dupliquée', 'copy-2');
  };

  const handleTransfer = async (data: Parameters<typeof createTransfer.mutateAsync>[0]) => {
    await createTransfer.mutateAsync(data);
    pushToast('Virement effectué');
    setModal(null);
  };

  const handleImport = async (data: { filename: string; bankName: string; txs: { date: string; libelle: string; montant: number; type: 'income' | 'expense' }[] }) => {
    if (modal?.kind !== 'import') return;
    const { transactionCount } = await createImport.mutateAsync({ accountId: modal.accId, ...data });
    pushToast(`${transactionCount} opérations importées`, 'check-circle-2');
    setModal(null);
  };

  const handleSkipForecast = async (f: ForecastItem) => {
    const monthPrefix = f.date.slice(0, 7);
    await skipRecurrence.mutateAsync({ id: f.id, monthPrefix });
    pushToast(`Ignoré pour ${monthPrefix.split('-').reverse().join('/')}`, 'calendar-clock', {
      label: 'Annuler',
      fn: () => unskipRecurrence.mutateAsync({ id: f.id, monthPrefix }),
    });
  };

  const handleConfirmForecast = async (f: ForecastItem, date?: string): Promise<string> => {
    const { id } = await createTx.mutateAsync({ accountId: f.accountId, type: f.sens as 'income' | 'expense', montant: f.montant, categorieId: f.categorieId ?? undefined, libelle: f.libelle, date: date ?? f.date, note: '', recurrenceId: f.id });
    pushToast(`${f.libelle || 'Opération'} confirmée`, 'check-circle-2', {
      label: 'Annuler',
      fn: () => deleteTx.mutateAsync(id),
    });
    return id;
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

  const handleDeleteAccount = async (accId: string) => {
    await deleteAccount.mutateAsync(accId);
    pushToast('Compte supprimé', 'trash-2');
    setModal(null);
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

  const handleDeleteMember = async (id: string) => {
    await deleteMember.mutateAsync(id);
    pushToast('Membre supprimé', 'trash-2');
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
      ...(isArchived ? [{ sep: true }, { icon: <Trash2 size={16} />, label: 'Supprimer définitivement', danger: true, fn: () => setModal({ kind: 'delete-account' as const, accId }) }] : []),
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
          onOpenDashboard={layout.openDashboard}
          onContext={(x, y, accId) => setCtx({ x, y, accId })}
          onMemberContext={(x, y, m) => setMemberCtx({ x, y, member: m })}
          onAddAccount={(memberId) => setModal({ kind: 'account', memberId })}
          onAddMember={() => setModal({ kind: 'member' })}
          onOpenCategories={() => setModal({ kind: 'categories' })}
        />
        <div className="main">
          <div className="panes">
            {!layout.activeId && (
              <DashboardPane
                members={members}
                accounts={accounts}
                onOpenAccount={layout.openTab}
              />
            )}
            {activePaneProps && (
              <AccountPane
                key={layout.activeId!}
                {...activePaneProps}
                accounts={accounts} members={members}
                mobileSection={mobileSection}
                onAdd={() => setModal({ kind: 'add', accId: layout.activeId! })}
                onTransfer={() => setModal({ kind: 'transfer', accId: layout.activeId! })}
                onImport={() => setModal({ kind: 'import', accId: layout.activeId! })}
                onEdit={tx => setModal({ kind: 'edit', tx })}
                onDelete={handleDeleteTx}
                onTxContext={(x, y, tx) => setTxCtx({ x, y, tx })}
                onConfirmForecast={handleConfirmForecast}
                onSkipForecast={handleSkipForecast}
                onTogglePrevisions={() => handleTogglePrev(layout.activeId!)}
              />
            )}
            {layout.splitOn && splitPaneProps && layout.splitId !== layout.activeId && (
              <AccountPane
                key={'s' + layout.splitId}
                {...splitPaneProps}
                accounts={accounts} members={members}
                isSplitTarget
                mobileSection={mobileSection}
                onAdd={() => setModal({ kind: 'add', accId: layout.splitId! })}
                onTransfer={() => setModal({ kind: 'transfer', accId: layout.splitId! })}
                onImport={() => setModal({ kind: 'import', accId: layout.splitId! })}
                onEdit={tx => setModal({ kind: 'edit', tx })}
                onDelete={handleDeleteTx}
                onTxContext={(x, y, tx) => setTxCtx({ x, y, tx })}
                onConfirmForecast={handleConfirmForecast}
                onSkipForecast={handleSkipForecast}
                onTogglePrevisions={() => handleTogglePrev(layout.splitId!)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {modal?.kind === 'add' && (
        <AddTransactionModal categories={categories}
          defaultAccountId={modal.accId} isPending={createTx.isPending}
          onClose={() => setModal(null)} onSave={handleAddTx} />
      )}
      {modal?.kind === 'transfer' && (
        <TransferModal accounts={accounts} members={members} categories={categories} defaultFromId={modal.accId}
          isPending={createTransfer.isPending}
          onClose={() => setModal(null)} onSave={handleTransfer} />
      )}
      {modal?.kind === 'import' && (
        <ImportModal
          accountId={modal.accId}
          accountName={accounts.find(a => a.id === modal.accId)?.nom ?? ''}
          isPending={createImport.isPending}
          onClose={() => setModal(null)}
          onImport={handleImport}
        />
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
          onReorder={(ids) => reorderCategories.mutate(ids)}
        />
      )}
      {modal?.kind === 'member' && (
        <MemberFormModal isPending={createMember.isPending}
          onClose={() => setModal(null)} onSave={handleCreateMember} />
      )}
      {modal?.kind === 'edit-member' && (
        <MemberFormModal
          member={modal.member}
          isPending={updateMember.isPending || deleteMember.isPending}
          onClose={() => setModal(null)}
          onSave={data => handleEditMember(modal.member.id, data)}
          onDelete={() => handleDeleteMember(modal.member.id)}
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

      {/* Confirmation suppression compte archivé */}
      {modal?.kind === 'delete-account' && (() => {
        const acc = accounts.find(a => a.id === modal.accId);
        return acc ? (
          <Modal title="Supprimer le compte" onClose={() => setModal(null)}>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                Supprimer définitivement <strong>{acc.nom}</strong> ? Toutes les transactions,
                récurrences et pièces jointes associées seront effacées. Cette action est irréversible.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setModal(null)} disabled={deleteAccount.isPending}>Annuler</button>
              <button className="btn danger" disabled={deleteAccount.isPending}
                style={{ background: 'var(--neg)', color: '#fff', borderColor: 'transparent' }}
                onClick={() => handleDeleteAccount(modal.accId)}>
                {deleteAccount.isPending ? <Loader2 size={15} className="spin" /> : <><Trash2 size={15} /> Supprimer définitivement</>}
              </button>
            </div>
          </Modal>
        ) : null;
      })()}

      {/* Confirmation suppression tx avec pièce jointe */}
      {modal?.kind === 'confirm-delete-tx' && (
        <Modal title="Supprimer l'opération" onClose={() => setModal(null)}>
          <div className="modal-body">
            <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
              Cette opération a une <strong>pièce jointe</strong>. La supprimer effacera aussi le reçu associé.
            </p>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setModal(null)} disabled={deleteTx.isPending}>Annuler</button>
            <button className="btn danger" disabled={deleteTx.isPending} onClick={() => handleDeleteTx(modal.tx)}>
              {deleteTx.isPending ? <Loader2 size={15} className="spin" /> : <><Trash2 size={15} /> Supprimer quand même</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Context menu — transaction */}
      {txCtx && (() => {
        const t = txCtx.tx;
        const cat = categories.find(c => c.id === t.categorieId);
        const hue = cat?.hue ?? 250;
        const isTransfer = t.type === 'transfer';
        const sign = t.type === 'income' ? '+' : isTransfer ? '⇄' : '−';
        const color = isTransfer ? 'var(--surface-3)' : `oklch(0.6 0.12 ${hue})`;
        const subtitle = `${t.type === 'income' ? '+' : '−'}${fmtEur(t.montant)} · ${t.date.split('-').reverse().join('/')}`;
        return (
          <ContextMenu
            ctx={txCtx}
            header={{
              title: t.libelle || cat?.nom || 'Opération',
              subtitle,
              color,
              initiales: sign,
            }}
            actions={[
              ...(!isTransfer ? [{ icon: <Copy size={16} />, label: 'Dupliquer', fn: () => handleDuplicateTx(t) }] : []),
              { sep: true },
              { icon: <Trash2 size={16} />, label: 'Supprimer', danger: true, fn: () => t.receiptPath ? setModal({ kind: 'confirm-delete-tx', tx: t }) : handleDeleteTx(t) },
            ]}
            onClose={() => setTxCtx(null)}
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
