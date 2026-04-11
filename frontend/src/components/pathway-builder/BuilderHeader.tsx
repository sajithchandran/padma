'use client';

import Link from 'next/link';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { useBuilderStore } from '@/store/builder.store';

export function BuilderHeader() {
  const { pathway, isDirty, isReadOnly } = useBuilderStore();

  if (!pathway) return null;

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    active: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    deprecated: 'bg-muted text-muted-foreground border border-border',
  };

  return (
    <div className="h-14 border-b border-border bg-card px-4 flex items-center gap-4 shrink-0">
      <Link
        href="/pathways"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="w-px h-6 bg-border" />

      <GitBranch className="w-4 h-4 text-muted-foreground/60" />

      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-foreground truncate">{pathway.name}</span>
        <span className="text-xs font-mono text-muted-foreground/60">{pathway.code}</span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[pathway.status] ?? statusColors.draft}`}
        >
          {pathway.status}
        </span>
        <span className="text-[10px] text-muted-foreground/60">v{pathway.version}</span>
        {pathway.careTeam?.name && (
          <span className="text-[10px] rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary border border-primary/20">
            Team: {pathway.careTeam.name}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isDirty && (
          <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            Unsaved changes
          </span>
        )}
        {isReadOnly && (
          <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
            Read-only
          </span>
        )}
      </div>
    </div>
  );
}
