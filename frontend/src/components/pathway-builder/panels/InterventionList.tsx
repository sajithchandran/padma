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
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {isTempStage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Save the pathway first to persist this new stage, then add interventions for it.
        </div>
      )}

      {!isTempStage && interventions.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          No interventions defined yet
        </div>
      ) : !isTempStage ? (
        <div className="space-y-2">
          {interventions.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-2 p-2.5 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {inv.name}
                  </span>
                  {inv.isCritical && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    {getTypeLabel(inv.interventionType)}
                  </span>
                  {inv.metadata?.libraryTemplateName && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                      {String(inv.metadata.libraryTemplateName)}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {inv.frequencyType} | Day {inv.startDayOffset}
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
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(inv.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 rounded-md border border-dashed border-blue-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
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
