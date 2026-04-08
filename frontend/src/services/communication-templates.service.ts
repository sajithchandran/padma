import api from '@/lib/api';

export type CommunicationTemplateStatus = 'draft' | 'approved' | string;
export type CommunicationTemplateChannel = 'sms' | 'whatsapp' | 'email' | 'in_app' | 'push' | string;
export type CommunicationTemplateCategory =
  | 'reminder'
  | 'escalation'
  | 'welcome'
  | 'transition'
  | 'graduation'
  | 'ad_hoc'
  | string;

export interface ApiCommunicationTemplate {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  channel: CommunicationTemplateChannel;
  language: string;
  subject?: string | null;
  bodyTemplate: string;
  variables?: Record<string, unknown> | null;
  category: CommunicationTemplateCategory;
  version: number;
  status: CommunicationTemplateStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export async function fetchCommunicationTemplates(params?: {
  channel?: string;
  category?: string;
  status?: string;
}) {
  const { data } = await api.get<ApiCommunicationTemplate[]>('/communication/templates', { params });
  return data;
}

export async function fetchCommunicationTemplate(id: string) {
  const { data } = await api.get<ApiCommunicationTemplate>(`/communication/templates/${id}`);
  return data;
}

export async function createCommunicationTemplate(payload: {
  code: string;
  name: string;
  channel: string;
  language?: string;
  subject?: string;
  bodyTemplate: string;
  variables?: Record<string, unknown>;
  category: string;
}) {
  const { data } = await api.post<ApiCommunicationTemplate>('/communication/templates', payload);
  return data;
}

export async function approveCommunicationTemplate(id: string) {
  const { data } = await api.post<ApiCommunicationTemplate>(`/communication/templates/${id}/approve`, {});
  return data;
}
