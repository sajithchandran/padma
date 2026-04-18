'use client';

import {
  Plus,
  LayoutGrid,
  Save,
  Upload,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuilderStore } from '@/store/builder.store';

interface BuilderToolbarProps {
  onAddStage: () => void;
  onAutoLayout: () => void;
  onSave: () => void;
  onPublish: () => void;
}

export function BuilderToolbar({
  onAddStage,
  onAutoLayout,
  onSave,
  onPublish,
}: BuilderToolbarProps) {
  const { isReadOnly, isDirty, isSaving, isPublishing } = useBuilderStore();

  return (
    <div className="h-12 border-b border-border/40 bg-card/60 backdrop-blur-xl px-4 flex items-center gap-2 shrink-0 transition-all duration-300">
      {/* Left actions */}
      {!isReadOnly && (
        <>
          <button
            onClick={onAddStage}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-xl transition-all duration-300 active:scale-95"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            Add Stage
          </button>

          <div className="w-px h-5 bg-border/40 mx-1" />
        </>
      )}

      <button
        onClick={onAutoLayout}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground hover:bg-muted/40 px-3 py-2 rounded-xl transition-all duration-300 active:scale-95"
      >
        <LayoutGrid className="w-4 h-4 opacity-70" />
        Auto Layout
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className={cn(
              "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-xl transition-all duration-300 shadow-xl active:scale-95",
              isDirty
                ? 'text-primary-foreground bg-primary hover:bg-primary/90 shadow-primary/20'
                : 'text-muted-foreground bg-muted/40 cursor-not-allowed opacity-50 shadow-none'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={onPublish}
            disabled={isPublishing || isDirty}
            className={cn(
              "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-xl transition-all duration-300 shadow-xl active:scale-95",
              !isDirty && !isPublishing
                ? 'text-white bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                : 'text-muted-foreground bg-muted/40 cursor-not-allowed opacity-50 shadow-none'
            )}
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      )}
    </div>
  );
}
