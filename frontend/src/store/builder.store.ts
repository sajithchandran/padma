import { create } from 'zustand';
import type { ApiPathway, ActivePanel } from '@/types/pathway-builder.types';

interface BuilderState {
  // Data
  pathway: ApiPathway | null;
  snapshot: ApiPathway | null; // last-saved state for diffing

  // UI state
  activePanel: ActivePanel | null;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;

  // Derived
  isReadOnly: boolean;

  // Actions
  setPathway: (p: ApiPathway) => void;
  takeSnapshot: () => void;
  setActivePanel: (panel: ActivePanel | null) => void;
  markDirty: () => void;
  markClean: () => void;
  setSaving: (v: boolean) => void;
  setPublishing: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  pathway: null,
  snapshot: null,
  activePanel: null,
  isDirty: false,
  isSaving: false,
  isPublishing: false,
  isReadOnly: false,
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  ...initialState,

  setPathway: (p) =>
    set({
      pathway: p,
      isReadOnly: p.status !== 'draft',
    }),

  takeSnapshot: () =>
    set((s) => ({
      snapshot: s.pathway ? JSON.parse(JSON.stringify(s.pathway)) : null,
      isDirty: false,
    })),

  setActivePanel: (panel) => set({ activePanel: panel }),

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  setSaving: (v) => set({ isSaving: v }),
  setPublishing: (v) => set({ isPublishing: v }),

  reset: () => set(initialState),
}));
