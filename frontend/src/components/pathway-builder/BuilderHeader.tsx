'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, GitBranch, Loader2 } from 'lucide-react';
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
        {versions.length > 1 && (
          <select
            value={pathway.id}
            onChange={(event) => router.push(`/pathways/${event.target.value}/builder`)}
            className="h-8 rounded-lg border border-border bg-background px-2 text-[11px] font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            title="Open another pathway version"
          >
            {versions
              .slice()
              .sort((a, b) => b.version - a.version)
              .map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.version} - {version.status}
                </option>
              ))}
          </select>
        )}
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
        {isReadOnly && onCreateEditableVersion && (
          <button
            onClick={onCreateEditableVersion}
            disabled={isCloning}
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCloning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            {isCloning ? 'Creating...' : 'Create Editable Version'}
          </button>
        )}
      </div>
    </div>
  );
}
