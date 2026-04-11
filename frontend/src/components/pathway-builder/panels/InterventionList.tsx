'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { ApiIntervention } from '@/types/pathway-builder.types';
import { InterventionForm } from './InterventionForm';
import {
  fetchInterventions,
  createIntervention,
  updateIntervention,
  deleteIntervention,
  createCareTaskTemplate,
} from '@/services/pathway.service';
import { INTERVENTION_TYPES } from '../utils/constants';

interface InterventionListProps {
  stageId: string;
  isReadOnly: boolean;
}

export function InterventionList({ stageId, isReadOnly }: InterventionListProps) {
  const isTempStage = stageId.startsWith('temp_stage_');
  const [interventions, setInterventions] = useState<ApiIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<ApiIntervention | undefined>();

  const load = async () => {
    if (isTempStage) {
      setInterventions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchInterventions(stageId);
      setInterventions(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isTempStage, stageId]);

  const handleCreate = async (data: any) => {
    const {
      saveToLibrary,
      sourceTemplateId,
      sourceTemplateName,
      ...payload
    } = data;

    let libraryTemplateId = sourceTemplateId ?? null;
    let libraryTemplateName = sourceTemplateName ?? null;

    if (saveToLibrary) {
      const createdTemplate = await createCareTaskTemplate({
        ...payload,
      });
      libraryTemplateId = createdTemplate.id;
      libraryTemplateName = createdTemplate.name;
    }

    await createIntervention(stageId, {
      ...payload,
      metadata: libraryTemplateId
        ? {
            libraryTemplateId,
            libraryTemplateName,
          }
        : undefined,
      sortOrder: interventions.length,
    });
    await load();
  };

  const handleUpdate = async (data: any) => {
    if (!editingIntervention) return;
    const {
      saveToLibrary: _saveToLibrary,
      sourceTemplateId: _sourceTemplateId,
      sourceTemplateName: _sourceTemplateName,
      ...payload
    } = data;
    await updateIntervention(editingIntervention.id, payload);
    setEditingIntervention(undefined);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteIntervention(id);
    await load();
  };

  const getTypeLabel = (type: string) =>
    INTERVENTION_TYPES.find((t) => t.value === type)?.label ?? type;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground/40">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5">
      {isTempStage && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-amber-500 leading-relaxed">
          Save the pathway first to persist this new stage, then add interventions for it.
        </div>
      )}

      {!isTempStage && interventions.length === 0 ? (
        <div className="text-center py-12 text-xs text-muted-foreground font-medium">
          No interventions defined yet
        </div>
      ) : !isTempStage ? (
        <div className="space-y-3">
          {interventions.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 p-3.5 border border-border bg-card/50 rounded-xl hover:bg-muted/50 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {inv.name}
                  </span>
                  {inv.isCritical && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-black uppercase tracking-tighter bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                    {getTypeLabel(inv.interventionType)}
                  </span>
                  {inv.metadata?.libraryTemplateName && (
                    <span className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                      {String(inv.metadata.libraryTemplateName)}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter ml-auto">
                    {inv.frequencyType} • D{inv.startDayOffset}
                    {inv.endDayOffset != null ? `–${inv.endDayOffset}` : '+'}
                  </span>
                </div>
              </div>
              {!isReadOnly && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingIntervention(inv);
                      setShowForm(true);
                    }}
                    className="p-2 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Edit intervention"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(inv.id)}
                    className="p-2 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete intervention"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {!isReadOnly && !isTempStage && (
        <button
          onClick={() => {
            setEditingIntervention(undefined);
            setShowForm(true);
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 py-3 rounded-xl border border-dashed border-primary/30 transition-all hover:border-primary/50"
        >
          <Plus className="w-4 h-4" />
          Add Intervention
        </button>
      )}

      {showForm && (
        <InterventionForm
          intervention={editingIntervention}
          onSave={editingIntervention ? handleUpdate : handleCreate}
          onClose={() => {
            setShowForm(false);
            setEditingIntervention(undefined);
          }}
        />
      )}
    </div>
  );
}
