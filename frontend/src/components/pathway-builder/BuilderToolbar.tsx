'use client';

import {
  Plus,
  LayoutGrid,
  Save,
  Upload,
  Loader2,
} from 'lucide-react';
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
    <div className="h-11 border-b border-slate-200 bg-slate-50 px-4 flex items-center gap-2 shrink-0">
      {/* Left actions */}
      {!isReadOnly && (
        <>
          <button
            onClick={onAddStage}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stage
          </button>

          <div className="w-px h-5 bg-slate-200" />
        </>
      )}

      <button
        onClick={onAutoLayout}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-md transition-colors"
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
            className={`
              flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors
              ${isDirty
                ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-sm'
                : 'text-slate-400 bg-slate-100 cursor-not-allowed'
              }
            `}
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
            className={`
              flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors
              ${!isDirty && !isPublishing
                ? 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                : 'text-slate-400 bg-slate-100 cursor-not-allowed'
              }
            `}
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
