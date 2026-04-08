'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Clock, Inbox, Mail, MessageSquare, Phone, Plus, Send, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PatientSearch } from '@/components/patients/PatientSearch';
import {
  fetchCommunicationTemplates,
} from '@/services/communication-templates.service';
import {
  fetchCommunicationPatients,
  fetchCommunicationMessages,
  sendCommunicationMessage,
  type CommunicationPatientOption,
} from '@/services/communications.service';
import type { ApiPatientSearchResult } from '@/services/patients.service';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  in_app: <MessageSquare className="h-3.5 w-3.5" />,
  push: <MessageSquare className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
};

function formatDateLabel(value?: string | null, fallback = 'Not sent') {
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

function statusVariant(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'sent' || status === 'delivered' || status === 'read') return 'success';
  if (status === 'pending') return 'info';
  if (status === 'skipped') return 'warning';
  if (status === 'failed') return 'danger';
  return 'neutral';
}

function getMessageContent(message: {
  body?: string | null;
  subject?: string | null;
  templateCode?: string | null;
  purpose: string;
  failureReason?: string | null;
  status: string;
}) {
  const body = message.body?.trim();
  if (body) return body;

  if (message.failureReason) {
    return `Message ${message.status}: ${message.failureReason}`;
  }

  if (message.subject?.trim()) {
    return message.subject.trim();
  }

  if (message.templateCode?.trim()) {
    return `Template: ${message.templateCode.trim()}`;
  }

  return `${prettify(message.purpose)} message`;
}

function NewMessageModal({
  patients,
  onClose,
}: {
  patients: CommunicationPatientOption[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<ApiPatientSearchResult | null>(null);
  const [channel, setChannel] = useState('sms');
  const [purpose, setPurpose] = useState('reminder');
  const [templateCode, setTemplateCode] = useState('');
  const [variablesText, setVariablesText] = useState('{}');
  const [relatedEntityType, setRelatedEntityType] = useState('');
  const [relatedEntityId, setRelatedEntityId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data: templates = [] } = useQuery({
    queryKey: ['communication-approved-templates'],
    queryFn: () => fetchCommunicationTemplates({ status: 'approved' }),
  });

  const availableTemplates = useMemo(
    () => templates.filter((template) => template.channel === channel),
    [templates, channel],
  );

  useEffect(() => {
    if (!availableTemplates.some((template) => template.code === templateCode)) {
      setTemplateCode(availableTemplates[0]?.code ?? '');
    }
  }, [availableTemplates, templateCode]);

  const selectedTemplate = availableTemplates.find((template) => template.code === templateCode) ?? null;

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

      return sendCommunicationMessage({
        patientId: selectedPatient!.id,
        channel,
        templateCode,
        variables,
        purpose,
        relatedEntityType: relatedEntityType.trim() || undefined,
        relatedEntityId: relatedEntityId.trim() || undefined,
        idempotencyKey: `comm-${Date.now()}`,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['communication-messages'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-messages', selectedPatient?.id] }),
        queryClient.invalidateQueries({ queryKey: ['communication-approved-templates'] }),
      ]);
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to send message.'));
    },
  });

  const isValid = Boolean(selectedPatient?.id && channel && purpose && templateCode);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Send Message</h2>
            <p className="text-xs text-slate-500 mt-0.5">Send a communication to a patient through an approved template</p>
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
            <PatientSearch
              label="Patient"
              value={selectedPatient}
              onChange={setSelectedPatient}
              disabled={mutation.isPending}
              placeholder="Search by patient name or MRN"
            />
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {['sms', 'whatsapp', 'email', 'in_app', 'push'].map((option) => (
                  <option key={option} value={option}>{prettify(option)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {['reminder', 'escalation', 'welcome', 'transition', 'graduation', 'ad_hoc'].map((option) => (
                  <option key={option} value={option}>{prettify(option)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Template</label>
              <select
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                disabled={mutation.isPending || availableTemplates.length === 0}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {availableTemplates.length === 0 ? (
                  <option value="">No approved templates for this channel</option>
                ) : (
                  availableTemplates.map((template) => (
                    <option key={template.id} value={template.code}>
                      {template.name} ({template.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Related Entity Type" value={relatedEntityType} onChange={(e) => setRelatedEntityType(e.target.value)} placeholder="task or enrollment" disabled={mutation.isPending} />
            <Input label="Related Entity ID" value={relatedEntityId} onChange={(e) => setRelatedEntityId(e.target.value)} placeholder="Optional UUID" disabled={mutation.isPending} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Variables JSON</label>
            <textarea
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              rows={6}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder='{"patientName":"Aisha Mohammed","body":"Custom message body fallback"}'
            />
          </div>

          {selectedTemplate && (
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Template Preview</p>
              {selectedTemplate.subject && (
                <p className="mt-2 text-sm font-medium text-slate-900">Subject: {selectedTemplate.subject}</p>
              )}
              <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-700 font-sans">{selectedTemplate.bodyTemplate}</pre>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={<Send className="h-4 w-4" />} onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!isValid}>
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = searchParams.get('tab') === 'outbound' ? 'outbound' : 'inbox';
  const [tab, setTab] = useState<'inbox' | 'outbound'>(initialTab);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('ALL');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<ApiPatientSearchResult | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    const nextTab = searchParams.get('tab') === 'outbound' ? 'outbound' : 'inbox';
    setTab(nextTab);
  }, [searchParams]);

  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ['communication-patients'],
    queryFn: fetchCommunicationPatients,
  });

  useEffect(() => {
    setSelectedPatientId(selectedPatientFilter?.id ?? 'ALL');
  }, [selectedPatientFilter]);

  const {
    data: messageHistory,
    isLoading: messagesLoading,
    isError: messagesError,
    error: messagesQueryError,
  } = useQuery({
    queryKey: ['communication-messages', selectedPatientId],
    queryFn: () => fetchCommunicationMessages({
      patientId: selectedPatientId === 'ALL' ? undefined : selectedPatientId,
      page: 1,
      limit: 100,
    }),
  });

  const messages = messageHistory?.data ?? [];
  const patientNameMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  const filteredMessages = useMemo(
    () => messages.filter((message) => (
      tab === 'inbox' ? message.direction === 'inbound' : message.direction === 'outbound'
    )),
    [messages, tab],
  );

  useEffect(() => {
    if (!filteredMessages.some((message) => message.id === selectedMessageId)) {
      setSelectedMessageId(filteredMessages[0]?.id ?? null);
    }
  }, [filteredMessages, selectedMessageId]);

  const selectedMessage = filteredMessages.find((message) => message.id === selectedMessageId) ?? null;
  const selectedPatient = selectedPatientId === 'ALL'
    ? null
    : patients.find((patient) => patient.id === selectedPatientId) ?? null;

  function switchTab(nextTab: 'inbox' | 'outbound') {
    setTab(nextTab);
    router.replace(`${pathname}?tab=${nextTab}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => switchTab('inbox')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'inbox' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Inbox className="h-4 w-4" /> Inbox
            </button>
            <button
              onClick={() => switchTab('outbound')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'outbound' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Send className="h-4 w-4" /> Outbound
            </button>
          </div>
          <div className="min-w-72">
            <PatientSearch
              value={selectedPatientFilter}
              onChange={setSelectedPatientFilter}
              disabled={patientsLoading}
              placeholder="Filter by patient name or MRN"
            />
          </div>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowComposer(true)} disabled={patients.length === 0}>
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
        <div className="lg:col-span-2 overflow-hidden">
          <Card padding="none" className="h-full flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {selectedPatient
                  ? `${selectedPatient.name} · ${filteredMessages.length} ${tab === 'inbox' ? 'messages' : 'sent'}`
                  : `All patients · ${filteredMessages.length} ${tab === 'inbox' ? 'messages' : 'sent'}`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {messagesLoading ? (
                <div className="px-4 py-6 text-sm text-slate-500">Loading messages…</div>
              ) : messagesError ? (
                <div className="px-4 py-6 text-sm text-red-700">
                  {messagesQueryError instanceof Error ? messagesQueryError.message : 'Unable to load patient messages.'}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No {tab === 'inbox' ? 'inbound' : 'outbound'} messages found for the current filter.
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => setSelectedMessageId(message.id)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors border-l-4 ${selectedMessageId === message.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          {TYPE_ICONS[message.channel] ?? <MessageSquare className="h-3.5 w-3.5" />} {prettify(message.channel)}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {patientNameMap.get(message.patientId) || message.patientId}
                        </span>
                      </div>
                      <Badge variant={statusVariant(message.status)} size="sm">{prettify(message.status)}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-1 truncate">
                      {message.subject || message.templateCode || prettify(message.purpose)}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{getMessageContent(message)}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateLabel(message.sentAt || message.createdAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 overflow-hidden">
          <Card padding="none" className="h-full flex flex-col overflow-hidden">
            {selectedMessage ? (
              <>
                <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{patientNameMap.get(selectedMessage.patientId) || selectedMessage.patientId}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          {TYPE_ICONS[selectedMessage.channel] ?? <MessageSquare className="h-3.5 w-3.5" />}
                          via {prettify(selectedMessage.channel)}
                        </span>
                        <Badge variant={statusVariant(selectedMessage.status)} size="sm">{prettify(selectedMessage.status)}</Badge>
                        <Badge variant="neutral" size="sm">{prettify(selectedMessage.purpose)}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDateLabel(selectedMessage.sentAt || selectedMessage.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {selectedMessage.subject && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Subject</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{selectedMessage.subject}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Message</p>
                    <div className={`mt-2 max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${selectedMessage.direction === 'outbound' ? 'bg-blue-600 text-white rounded-tr-sm ml-auto' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                      {getMessageContent(selectedMessage)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Template Code</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{selectedMessage.templateCode || 'Manual / fallback'}</p>
                      <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-400">Provider</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{selectedMessage.providerName || 'N/A'}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Related Entity</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{selectedMessage.relatedEntityType || 'N/A'}</p>
                      <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-400">Failure Reason</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{selectedMessage.failureReason || 'None'}</p>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a message to view</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showComposer && (
        <NewMessageModal
          patients={patients}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}
