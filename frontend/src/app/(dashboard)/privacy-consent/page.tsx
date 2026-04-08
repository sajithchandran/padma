'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Plus, Shield, Trash2, X } from 'lucide-react';
import { Card, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { PatientSearch } from '@/components/patients/PatientSearch';
import type { ApiPatientSearchResult } from '@/services/patients.service';
import {
  fetchPatientConsents,
  grantPatientConsent,
  withdrawPatientConsent,
  type ApiPatientConsent,
} from '@/services/privacy.service';

const CONSENT_TYPES = [
  'communication_sms',
  'communication_whatsapp',
  'communication_email',
  'communication_in_app',
  'communication_push',
];

const COLLECTION_METHODS = ['app', 'paper', 'verbal_recorded'];

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

function consentStatusVariant(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'granted') return 'success';
  if (status === 'withdrawn') return 'warning';
  return 'neutral';
}

function GrantConsentModal({
  patient,
  onClose,
}: {
  patient: ApiPatientSearchResult;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [consentType, setConsentType] = useState(CONSENT_TYPES[0]);
  const [method, setMethod] = useState(COLLECTION_METHODS[0]);
  const [version, setVersion] = useState('1.0');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () => grantPatientConsent(patient.id, {
      consentType,
      method,
      version: version.trim() || undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patient-consents', patient.id] });
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to grant consent.'));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Grant Consent</h2>
            <p className="text-xs text-slate-500 mt-0.5">{patient.name}</p>
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

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Consent Type</label>
            <select
              value={consentType}
              onChange={(e) => setConsentType(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {CONSENT_TYPES.map((type) => (
                <option key={type} value={type}>{prettify(type)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Collection Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {COLLECTION_METHODS.map((option) => (
                <option key={option} value={option}>{prettify(option)}</option>
              ))}
            </select>
          </div>

          <Input
            label="Consent Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
            disabled={mutation.isPending}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Grant Consent
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PrivacyConsentPage() {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<ApiPatientSearchResult | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  const {
    data: consents = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['patient-consents', selectedPatient?.id],
    queryFn: () => fetchPatientConsents(selectedPatient!.id),
    enabled: Boolean(selectedPatient?.id),
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ patientId, consentType }: { patientId: string; consentType: string }) =>
      withdrawPatientConsent(patientId, consentType),
    onSuccess: async () => {
      if (selectedPatient) {
        await queryClient.invalidateQueries({ queryKey: ['patient-consents', selectedPatient.id] });
      }
    },
  });

  const activeConsents = useMemo(
    () => consents.filter((consent) => consent.status === 'granted'),
    [consents],
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader action={selectedPatient ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowGrantModal(true)}>Grant Consent</Button> : undefined}>
          <CardTitle>Privacy & Consent</CardTitle>
          <CardSubtitle>Record, review, and withdraw patient communication consents</CardSubtitle>
        </CardHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,0.6fr] gap-4">
          <PatientSearch
            label="Patient"
            value={selectedPatient}
            onChange={setSelectedPatient}
            placeholder="Search patient by name or MRN"
          />
          <Card className="p-4 bg-slate-50">
            <p className="text-xs uppercase tracking-wide text-slate-400">Active Consents</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{activeConsents.length}</p>
            <p className="mt-1 text-xs text-slate-500">Current granted consent records for the selected patient</p>
          </Card>
        </div>
      </Card>

      {!selectedPatient ? (
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">Select a patient to manage consent.</p>
              <p className="mt-1 text-sm text-slate-500">Use the patient search above to load consent history and record new consent.</p>
            </div>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="p-8">
          <p className="text-sm text-slate-500">Loading consent records…</p>
        </Card>
      ) : isError ? (
        <Card className="p-8">
          <p className="text-sm font-medium text-red-700">Unable to load consent records.</p>
          <p className="mt-1 text-sm text-slate-500">{error instanceof Error ? error.message : 'The consent API request failed.'}</p>
        </Card>
      ) : consents.length === 0 ? (
        <Card className="p-8">
          <p className="text-sm font-medium text-slate-900">No consent records found.</p>
          <p className="mt-1 text-sm text-slate-500">Grant a consent for {selectedPatient.name} to enable communication workflows.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {consents.map((consent: ApiPatientConsent) => (
            <Card key={consent.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{prettify(consent.consentType)}</h3>
                    <Badge variant={consentStatusVariant(consent.status)} size="sm">
                      {prettify(consent.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {prettify(consent.collectionMethod)} · Version {consent.consentVersion || 'N/A'}
                  </p>
                </div>

                {consent.status === 'granted' && (
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => withdrawMutation.mutate({ patientId: selectedPatient.id, consentType: consent.consentType })}
                    loading={withdrawMutation.isPending}
                  >
                    Withdraw
                  </Button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Granted At</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(consent.grantedAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Withdrawn At</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(consent.withdrawnAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Expires At</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(consent.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">IP Address</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{consent.ipAddress || 'N/A'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showGrantModal && selectedPatient && (
        <GrantConsentModal
          patient={selectedPatient}
          onClose={() => setShowGrantModal(false)}
        />
      )}
    </div>
  );
}
