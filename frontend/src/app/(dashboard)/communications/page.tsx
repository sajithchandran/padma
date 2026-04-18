'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Clock, Inbox, Mail, MessageSquare, Phone, Plus, Send, X, Loader2, Shield, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PatientSearch } from '@/components/patients/PatientSearch';
import { cn } from '@/lib/utils';
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

function getQueryErrorMessage(error: unknown) {
  const message = (error as any)?.response?.data?.message ?? (error instanceof Error ? error.message : null);
  return Array.isArray(message) ? message.join(', ') : (message ?? 'Unable to load messages.');
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-card border border-border/60 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-muted/20 backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">Send Message</h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Approved Communication Template</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 custom-scrollbar">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PatientSearch
              label="Recipient Patient"
              value={selectedPatient}
              onChange={setSelectedPatient}
              disabled={mutation.isPending}
              placeholder="Search by name or MRN"
            />
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                disabled={mutation.isPending}
                className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
              >
                {['sms', 'whatsapp', 'email', 'in_app', 'push'].map((option) => (
                  <option key={option} value={option} className="bg-card text-foreground">{prettify(option)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">Purpose / Intent</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={mutation.isPending}
                className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
              >
                {['reminder', 'escalation', 'welcome', 'transition', 'graduation', 'ad_hoc'].map((option) => (
                  <option key={option} value={option} className="bg-card text-foreground">{prettify(option)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">Approved Template</label>
              <select
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                disabled={mutation.isPending || availableTemplates.length === 0}
                className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
              >
                {availableTemplates.length === 0 ? (
                  <option value="" className="bg-card text-foreground">No templates for this channel</option>
                ) : (
                  availableTemplates.map((template) => (
                    <option key={template.id} value={template.code} className="bg-card text-foreground">
                      {template.name} ({template.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Related Entity Type" value={relatedEntityType} onChange={(e) => setRelatedEntityType(e.target.value)} placeholder="task or enrollment" disabled={mutation.isPending} />
            <Input label="Related Entity ID" value={relatedEntityId} onChange={(e) => setRelatedEntityId(e.target.value)} placeholder="Optional UUID" disabled={mutation.isPending} />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">Template Variables (JSON)</label>
            <textarea
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              rows={4}
              disabled={mutation.isPending}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
              placeholder='{"patientName":"..."}'
            />
          </div>

          {selectedTemplate && (
            <div className="p-6 rounded-3xl bg-primary/[0.03] border border-primary/10 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Template Preview</p>
              {selectedTemplate.subject && (
                <p className="text-base font-black text-foreground tracking-tight leading-none mb-3">Subject: {selectedTemplate.subject}</p>
              )}
              <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-relaxed">{selectedTemplate.bodyTemplate}</pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-border/40 bg-muted/20 backdrop-blur-xl">
          <Button variant="outline" onClick={onClose} className="font-bold rounded-xl h-11 px-6">Cancel</Button>
          <Button 
            icon={mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} 
            onClick={() => mutation.mutate()} 
            loading={mutation.isPending} 
            disabled={!isValid}
            className="rounded-xl h-11 px-8 shadow-xl shadow-primary/20"
          >
            {mutation.isPending ? 'Sending...' : 'Send Message'}
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
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex gap-1 bg-muted/60 dark:bg-slate-900/60 p-1 rounded-2xl border border-border/40 backdrop-blur-xl shrink-0">
            <button
              onClick={() => switchTab('inbox')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                tab === 'inbox' 
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xl" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <Inbox className="h-4 w-4" /> Inbox
            </button>
            <button
              onClick={() => switchTab('outbound')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                tab === 'outbound' 
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xl" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <Send className="h-4 w-4" /> Outbound
            </button>
          </div>
          <div className="min-w-80 w-full sm:w-auto">
            <PatientSearch
              value={selectedPatientFilter}
              onChange={setSelectedPatientFilter}
              disabled={patientsLoading}
              placeholder="Filter conversations..."
            />
          </div>
        </div>
        <Button 
          icon={<Plus className="h-4 w-4" />} 
          onClick={() => setShowComposer(true)} 
          disabled={patients.length === 0}
          className="rounded-2xl shadow-xl shadow-primary/10"
        >
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ height: 'calc(100vh - 260px)', minHeight: '520px' }}>
        <div className="lg:col-span-2 overflow-hidden">
          <Card padding="none" className="h-full flex flex-col overflow-hidden border-border/40 shadow-xl">
            <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                {selectedPatient
                  ? `${selectedPatient.name} · ${filteredMessages.length} ${tab === 'inbox' ? 'messages' : 'sent'}`
                  : `All Active Patients · ${filteredMessages.length} total`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/20 custom-scrollbar">
              {messagesLoading ? (
                <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  Loading history...
                </div>
              ) : messagesError ? (
                <div className="px-6 py-10 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500/40 mx-auto mb-3" />
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    {getQueryErrorMessage(messagesQueryError)}
                  </p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Mail className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">
                    No {tab} found
                  </p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => setSelectedMessageId(message.id)}
                    className={cn(
                      "group w-full text-left px-5 py-4 transition-all duration-300 relative border-l-4",
                      selectedMessageId === message.id 
                        ? 'bg-blue-500/5 border-l-blue-600 dark:bg-blue-600/10' 
                        : 'border-l-transparent hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-muted px-2 py-0.5 rounded-lg border border-border/40">
                          {TYPE_ICONS[message.channel] ?? <MessageSquare className="h-3 w-3" />} {message.channel}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">
                          {patientNameMap.get(message.patientId) || message.patientId}
                        </span>
                      </div>
                      <Badge variant={statusVariant(message.status)} size="xs" className="uppercase tracking-widest px-2 py-0.5">{message.status}</Badge>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400/80 mb-1.5 truncate">
                      {message.subject || message.templateCode || prettify(message.purpose)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">{getMessageContent(message)}</p>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 opacity-60" />
                        {formatDateLabel(message.sentAt || message.createdAt)}
                      </div>
                      {selectedMessageId === message.id && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 overflow-hidden">
          <Card padding="none" className="h-full flex flex-col overflow-hidden border-border/40 shadow-2xl bg-[#fafafa] dark:bg-black/20">
            {selectedMessage ? (
              <>
                <div className="px-8 py-6 border-b border-border/40 bg-white dark:bg-slate-900/40 flex-shrink-0">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/20 text-white shrink-0">
                        <User className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                          {patientNameMap.get(selectedMessage.patientId) || selectedMessage.patientId}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {TYPE_ICONS[selectedMessage.channel] ?? <MessageSquare className="h-3.5 w-3.5" />}
                            via {selectedMessage.channel}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <Badge variant={statusVariant(selectedMessage.status)} size="xs" className="uppercase tracking-widest">{selectedMessage.status}</Badge>
                          <Badge variant="neutral" size="xs" className="uppercase tracking-widest">{selectedMessage.purpose}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Delivered</p>
                      <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                        {formatDateLabel(selectedMessage.sentAt || selectedMessage.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">
                  {selectedMessage.subject && (
                    <div className="p-5 rounded-3xl bg-muted/30 border border-border/40">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message Subject</p>
                      <p className="text-base font-black text-slate-900 dark:text-white tracking-tight">{selectedMessage.subject}</p>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Communication Thread</p>
                    <div className={cn(
                      "max-w-[85%] rounded-[2rem] px-6 py-5 text-sm font-medium leading-[1.6] shadow-xl",
                      selectedMessage.direction === 'outbound' 
                        ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white rounded-tr-sm self-end shadow-blue-600/20' 
                        : 'bg-white dark:bg-slate-900 border border-border/60 text-slate-800 dark:text-slate-200 rounded-tl-sm self-start shadow-slate-200/50 dark:shadow-none'
                    )}>
                      {selectedMessage.direction === 'outbound' && (
                        <div className="flex items-center gap-2 mb-3 text-white/60">
                          <Shield className="h-3.5 w-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Encrypted Healthcare Message</span>
                        </div>
                      )}
                      {getMessageContent(selectedMessage)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl bg-muted/20 border border-border/40 group transition-colors hover:bg-muted/40">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Technical Context</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500/80">Template Reference</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedMessage.templateCode || 'Manual Dispatch'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500/80">Carrier / Provider</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedMessage.providerName || 'Local API'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 rounded-3xl bg-muted/20 border border-border/40 group transition-colors hover:bg-muted/40">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Enrollment Trace</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500/80">Clinical Object</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">{selectedMessage.relatedEntityType || 'System Wide'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500/80">Dispatch Status</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedMessage.failureReason || 'Success'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="h-24 w-24 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                  <Mail className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase tracking-widest">Select Conversation</h3>
                <p className="text-sm text-slate-400 font-medium max-w-[240px]">Deep dive into communication history for clinical insights.</p>
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
