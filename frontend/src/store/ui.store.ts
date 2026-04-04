'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  sidebarCollapsed: boolean;
  expandedGroups: string[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleGroup: (groupId: string) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      expandedGroups: ['patients', 'tasks'],
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      toggleGroup: (groupId) => {
        const { expandedGroups } = get();
        set({
          expandedGroups: expandedGroups.includes(groupId)
            ? expandedGroups.filter((g) => g !== groupId)
            : [...expandedGroups, groupId],
        });
      },
      setGroupExpanded: (groupId, expanded) => {
        const { expandedGroups } = get();
        set({
          expandedGroups: expanded
            ? Array.from(new Set([...expandedGroups, groupId]))
            : expandedGroups.filter((g) => g !== groupId),
        });
      },
    }),
    { name: 'padma-ui' },
  ),
);
