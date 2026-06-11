import { create } from 'zustand';

interface LayoutState {
  tabs: string[];
  activeId: string | null;
  splitOn: boolean;
  splitId: string | null;
  theme: 'light' | 'dark';

  openTab: (id: string) => void;
  openInNewTab: (id: string) => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  openDashboard: () => void;
  toggleSplit: (fallbackId?: string) => void;
  setSplit: (id: string) => void;
  closeSplit: () => void;
  toggleTheme: () => void;
  initTabs: (ids: string[]) => void;
}

export const useLayout = create<LayoutState>((set, get) => ({
  tabs: [],
  activeId: null,
  splitOn: false,
  splitId: null,
  theme: (localStorage.getItem('foyer-theme') as 'light' | 'dark') ?? 'light',

  initTabs: (ids) => {
    set({ tabs: ids.slice(0, 2), activeId: ids[0] ?? null, splitId: ids[1] ?? null });
  },

  openTab: (id) => {
    const { tabs, activeId } = get();
    if (tabs.includes(id)) { set({ activeId: id }); return; }
    // Remplace l'onglet actif
    const idx = tabs.indexOf(activeId!);
    const next = [...tabs];
    if (idx !== -1) next[idx] = id; else next.push(id);
    set({ tabs: next, activeId: id });
  },

  openInNewTab: (id) => {
    const { tabs } = get();
    if (tabs.includes(id)) { set({ activeId: id }); return; }
    set({ tabs: [...tabs, id], activeId: id });
  },

  closeTab: (id) => {
    const { tabs, activeId } = get();
    const next = tabs.filter(x => x !== id);
    if (id === activeId && next.length) set({ activeId: next[next.length - 1] });
    set({ tabs: next });
  },

  setActive: (id) => set({ activeId: id }),
  openDashboard: () => set({ activeId: null }),

  toggleSplit: (fallbackId) => {
    const { splitOn, tabs, activeId, splitId } = get();
    if (!splitOn) {
      const other = splitId ?? fallbackId ?? tabs.find(x => x !== activeId);
      set({ splitOn: true, splitId: other ?? null });
    } else {
      set({ splitOn: false });
    }
  },

  setSplit: (id) => {
    const { activeId } = get();
    set({ splitId: id, splitOn: true });
    if (id === activeId) {
      const { tabs } = get();
      const other = tabs.find(x => x !== id);
      if (other) set({ activeId: other });
    }
  },

  closeSplit: () => set({ splitOn: false }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('foyer-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },
}));
