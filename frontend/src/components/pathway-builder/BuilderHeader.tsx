'use client';

import Link from 'next/link';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { useBuilderStore } from '@/store/builder.store';

export function BuilderHeader() {
  const { pathway, isDirty, isReadOnly } = useBuilderStore();

  if (!pathway) return null;

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    deprecated: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="h-14 border-b border-slate-200 bg-white px-4 flex items-center gap-4 shrink-0">
      <Link
        href="/pathways"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="w-px h-6 bg-slate-200" />

      <GitBranch className="w-4 h-4 text-slate-400" />

      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-slate-800 truncate">{pathway.name}</span>
        <span className="text-xs font-mono text-slate-400">{pathway.code}</span>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[pathway.status] ?? statusColors.draft}`}
        >
          {pathway.status}
        </span>
        <span className="text-[10px] text-slate-400">v{pathway.version}</span>
        {pathway.careTeam?.name && (
          <span className="text-[10px] rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
            Team: {pathway.careTeam.name}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isDirty && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            Unsaved changes
          </span>
        )}
        {isReadOnly && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Read-only
          </span>
        )}
      </div>
    </div>
  );
}
