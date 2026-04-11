// ─── Backend API shapes ──────────────────────────────────────────────────────

export interface ApiStage {
  id: string;
  pathwayId: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  stageType: 'entry' | 'intermediate' | 'decision' | 'terminal';
  careSetting: string;
  sortOrder: number;
  expectedDurationDays?: number | null;
  minDurationDays?: number | null;
  autoTransition: boolean;
  entryActions?: any;
  exitActions?: any;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  interventionTemplates?: ApiIntervention[];
  transitionsFrom?: ApiTransition[];
  transitionsTo?: ApiTransition[];
  _count?: { currentEnrollments?: number };
}

export interface ApiIntervention {
  id: string;
  tenantId: string;
  stageId: string;
  interventionType: string;
  name: string;
  description?: string | null;
  careSetting: string;
  deliveryMode: string;
  frequencyType: string;
  frequencyValue?: number | null;
  startDayOffset: number;
  endDayOffset?: number | null;
  defaultOwnerRole?: string | null;
  autoCompleteSource?: string | null;
  autoCompleteEventType?: string | null;
  priority: number;
  isCritical: boolean;
  reminderConfig?: any;
  metadata?: any;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCareTaskTemplate {
  id: string;
  tenantId: string;
  interventionType: string;
  name: string;
  description?: string | null;
  careSetting: string;
  deliveryMode: string;
  frequencyType: string;
  frequencyValue?: number | null;
  startDayOffset: number;
  endDayOffset?: number | null;
  defaultOwnerRole?: string | null;
  autoCompleteSource?: string | null;
  autoCompleteEventType?: string | null;
  priority: number;
  isCritical: boolean;
  isActive: boolean;
  reminderConfig?: any;
  metadata?: any;
  createdAt: string;
  createdBy?: string | null;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface ApiTransition {
  id: string;
  tenantId: string;
  pathwayId: string;
  fromStageId: string;
  toStageId: string;
  ruleName: string;
  ruleDescription?: string | null;
  triggerType: 'outcome_based' | 'time_based' | 'manual' | 'event_based';
  conditionExpr: Record<string, any>;
  priority: number;
  isAutomatic: boolean;
  isActive: boolean;
  transitionActions?: any;
  createdAt: string;
  updatedAt: string;
  fromStage?: { id: string; name: string; code: string; stageType: string };
  toStage?: { id: string; name: string; code: string; stageType: string };
}

export interface ApiPathway {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  applicableSettings: string[];
  version: number;
  defaultDurationDays: number;
  externalSourceSystem?: string | null;
  externalSourceId?: string | null;
  careTeamId?: string | null;
  careTeam?: {
    id: string;
    name: string;
    description?: string | null;
    isActive?: boolean;
    _count?: { members: number };
  } | null;
  status: 'draft' | 'active' | 'deprecated';
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string | null;
  stages: ApiStage[];
  transitions: ApiTransition[];
  _count?: { enrollments: number };
}

// ─── Builder-specific types ──────────────────────────────────────────────────

export interface StageNodeData extends Record<string, unknown> {
  stage: ApiStage;
  interventionCount: number;
  isSelected: boolean;
  isReadOnly: boolean;
}

export interface TransitionEdgeData extends Record<string, unknown> {
  transition: ApiTransition;
  isSelected: boolean;
  isReadOnly: boolean;
}

export type StageType = 'entry' | 'intermediate' | 'decision' | 'terminal';
export type TriggerType = 'outcome_based' | 'time_based' | 'manual' | 'event_based';

export interface ActivePanel {
  type: 'stage' | 'transition';
  id: string;
}
