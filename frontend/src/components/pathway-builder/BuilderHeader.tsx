'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, GitBranch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuilderStore } from '@/store/builder.store';
import type { ApiPathway } from '@/types/pathway-builder.types';

interface BuilderHeaderProps {
  onCreateEditableVersion?: () => void;
  isCloning?: boolean;
  versions?: Pick<ApiPathway, 'id' | 'version' | 'status' | 'updatedAt'>[];
}

export function BuilderHeader({ onCreateEditableVersion, isCloning, versions = [] }: BuilderHeaderProps) {
  const router = useRouter();
  const { pathway, isDirty, isReadOnly } = useBuilderStore();

  if (!pathway) return null;

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    active: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    deprecated: 'bg-muted text-muted-foreground border border-border',
  };

  return (
    <div className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 flex items-center gap-4 shrink-0 transition-all duration-300">
      <Link
        href="/pathways"
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all duration-200"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="w-px h-6 bg-border/40" />

      <GitBranch className="w-4 h-4 text-primary/60" />

      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-sm text-foreground tracking-tight truncate">{pathway.name}</span>
        <span className="text-[10px] font-mono text-muted-foreground/40 tracking-tighter">{pathway.code}</span>
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border shadow-sm",
            statusColors[pathway.status] ?? statusColors.draft
          )}
        >
          {pathway.status}
        </span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground text-[10px] font-bold border border-border/20">
          V{pathway.version}
        </div>
        {pathway.careTeam?.name && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold border border-primary/20 shadow-sm shadow-primary/5">
            <span className="opacity-50 font-black tracking-widest text-[8px]">TEAM:</span>
            {pathway.careTeam.name}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {versions.length > 1 && (
          <select
            value={pathway.id}
            onChange={(event) => router.push(`/pathways/${event.target.value}/builder`)}
            className="h-8 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm px-2 text-[10px] font-bold uppercase tracking-wider text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            title="Open another pathway version"
          >
            {versions
              .slice()
              .sort((a, b) => b.version - a.version)
              .map((version) => (
                <option key={version.id} value={version.id}>
                  V{version.version} • {version.status.toUpperCase()}
                </option>
              ))}
          </select>
        )}
        {isDirty && (
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full animate-pulse shadow-sm shadow-amber-500/5">
            Modified
          </span>
        )}
        {isReadOnly && (
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded-full">
            Read-only
          </span>
        )}
        {isReadOnly && onCreateEditableVersion && (
          <button
            onClick={onCreateEditableVersion}
            disabled={isCloning}
            className="ml-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCloning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            {isCloning ? 'Cloning...' : 'Edit version'}
          </button>
        )}
      </div>
    </div>
  );
}
