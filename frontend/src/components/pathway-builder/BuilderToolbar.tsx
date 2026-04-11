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
    <div className="h-11 border-b border-border bg-card/80 backdrop-blur-md px-4 flex items-center gap-2 shrink-0">
      {/* Left actions */}
      {!isReadOnly && (
        <>
          <button
            onClick={onAddStage}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stage
          </button>

          <div className="w-px h-5 bg-border" />
        </>
      )}

      <button
        onClick={onAutoLayout}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1.5 rounded-lg transition-all"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Auto Layout
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      {!isReadOnly && (
        <>
          <button
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all shadow-sm",
              isDirty
                ? 'text-primary-foreground bg-primary hover:bg-primary/90'
                : 'text-muted-foreground bg-muted cursor-not-allowed opacity-50 shadow-none'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={onPublish}
            disabled={isPublishing || isDirty}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all shadow-sm",
              !isDirty && !isPublishing
                ? 'text-white bg-emerald-500 hover:bg-emerald-600'
                : 'text-muted-foreground bg-muted cursor-not-allowed opacity-50 shadow-none'
            )}
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </>
      )}
    </div>
  );
}
