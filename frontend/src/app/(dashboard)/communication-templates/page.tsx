'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Eye, Plus, Search, X } from 'lucide-react';
import { Card, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  approveCommunicationTemplate,
  createCommunicationTemplate,
  fetchCommunicationTemplate,
  fetchCommunicationTemplates,
  type ApiCommunicationTemplate,
} from '@/services/communication-templates.service';

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'All channels' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'in_app', label: 'In App' },
  { value: 'push', label: 'Push' },
];

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All categories' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'transition', label: 'Transition' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'ad_hoc', label: 'Ad Hoc' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
];

function formatDateLabel(value?: string | null, fallback = 'Never') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function prettify(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusVariant(status: string): 'neutral' | 'info' | 'success' {
  if (status === 'approved') return 'success';
  if (status === 'draft') return 'info';
  return 'neutral';
}

function CreateTemplateModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('sms');
  const [category, setCategory] = useState('reminder');
  const [language, setLanguage] = useState('en');
  const [subject, setSubject] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [variablesText, setVariablesText] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () => {
      let variables: Record<string, unknown> | undefined;
      if (variablesText.trim()) {
        try {
          variables = JSON.parse(variablesText);
        } catch {
          throw new Error('Variables must be valid JSON.');
        }
      }

      return createCommunicationTemplate({
        code: code.trim(),
        name: name.trim(),
        channel,
        category,
        language: language.trim() || 'en',
        subject: subject.trim() || undefined,
        bodyTemplate: bodyTemplate.trim(),
        variables,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create communication template.'));
    },
  });

  const isValid = code.trim().length > 0 && name.trim().length > 0 && bodyTemplate.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Communication Template</h2>
            <p className="text-xs text-slate-500 mt-0.5">Create a new draft template for outbound communication</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="appointment_reminder" disabled={mutation.isPending} />
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Appointment Reminder" disabled={mutation.isPending} />
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {CHANNEL_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {CATEGORY_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <Input label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" disabled={mutation.isPending} />
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Required for email templates"
              disabled={mutation.isPending}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Body Template</label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={8}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Hello {{patientName}}, this is a reminder for your appointment on {{appointmentDate}}."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Variables JSON</label>
            <textarea
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              rows={5}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder='{"patientName":"string","appointmentDate":"string"}'
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!isValid}>
            Create Template
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplateDetailsModal({
  templateId,
  onClose,
}: {
  templateId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data: template, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['communication-template', templateId],
    queryFn: () => fetchCommunicationTemplate(templateId),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveCommunicationTemplate(templateId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['communication-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['communication-template', templateId] }),
      ]);
      setError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to approve template.'));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Template Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">Review template content and approval status</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading template details…</p>
          ) : isError || !template ? (
            <p className="text-sm text-red-700">
              {queryError instanceof Error ? queryError.message : 'Unable to load template details.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(template.status)} size="sm">{prettify(template.status)}</Badge>
                <Badge variant="neutral" size="sm">{prettify(template.channel)}</Badge>
                <Badge variant="neutral" size="sm">{prettify(template.category)}</Badge>
                <Badge variant="info" size="sm">v{template.version}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Template Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{template.name}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Code</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{template.code}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Language</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{template.language}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(template.createdAt)}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Approved At</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(template.approvedAt)}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Updated</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(template.updatedAt)}</p>
                </Card>
              </div>

              {template.subject && (
                <Card className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Subject</p>
                  <p className="mt-1 text-sm text-slate-900">{template.subject}</p>
                </Card>
              )}

              <Card className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Body Template</p>
                <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-900 font-sans">{template.bodyTemplate}</pre>
              </Card>

              <Card className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Variables</p>
                <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-900 font-mono">
                  {JSON.stringify(template.variables ?? {}, null, 2)}
                </pre>
              </Card>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {template && template.status !== 'approved' && (
            <Button
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => approveMutation.mutate()}
              loading={approveMutation.isPending}
            >
              Approve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommunicationTemplatesPage() {
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const {
    data: templates = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['communication-templates', channel, category, status],
    queryFn: () =>
      fetchCommunicationTemplates({
        channel: channel === 'ALL' ? undefined : channel,
        category: category === 'ALL' ? undefined : category,
        status: status === 'ALL' ? undefined : status,
      }),
  });

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) =>
      template.name.toLowerCase().includes(query)
      || template.code.toLowerCase().includes(query)
      || template.channel.toLowerCase().includes(query)
      || template.category.toLowerCase().includes(query),
    );
  }, [templates, search]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>New Template</Button>}>
          <CardTitle>Communication Templates</CardTitle>
          <CardSubtitle>Manage reusable outbound message templates across channels and approval states</CardSubtitle>
        </CardHeader>

        <div className="mb-5 grid grid-cols-1 lg:grid-cols-[1.5fr,0.6fr,0.7fr,0.6fr] gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by template name, code, channel, or category"
            icon={<Search className="h-4 w-4" />}
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading communication templates…</p>
        ) : isError ? (
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'Unable to load communication templates.'}
          </p>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No communication templates match the current search or filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{template.name}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{template.code}</p>
                  </div>
                  <Badge variant={statusVariant(template.status)} size="sm">
                    {prettify(template.status)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="neutral" size="sm">{prettify(template.channel)}</Badge>
                  <Badge variant="neutral" size="sm">{prettify(template.category)}</Badge>
                  <Badge variant="info" size="sm">v{template.version}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Language</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{template.language}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Updated</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(template.updatedAt)}</p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500 line-clamp-3">
                  {template.subject || template.bodyTemplate}
                </p>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye className="h-4 w-4" />}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showCreateModal && (
        <CreateTemplateModal onClose={() => setShowCreateModal(false)} />
      )}

      {selectedTemplateId && (
        <TemplateDetailsModal
          templateId={selectedTemplateId}
          onClose={() => setSelectedTemplateId(null)}
        />
      )}
    </div>
  );
}
