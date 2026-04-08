'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Globe, Clock, Shield, Zap, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  fetchCurrentTenant,
  fetchTenantFeatureFlags,
  updateCurrentTenant,
} from '@/services/tenants.service';

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const INITIAL_FLAGS: FeatureFlag[] = [
  { key: 'realtime',           label: 'Real-time Notifications', description: 'SSE-based live updates for task and pathway changes', enabled: true },
  { key: 'advancedAnalytics',  label: 'Advanced Analytics', description: 'Enhanced reporting with drill-down capabilities', enabled: true },
  { key: 'genesysIntegration', label: 'Genesys Integration', description: 'Outbound call automation via Genesys cloud', enabled: false },
  { key: 'medhaAI',            label: 'Medha AI Insights', description: 'AI-powered care gap detection and recommendations', enabled: false },
  { key: 'salesforceSync',     label: 'Salesforce Sync', description: 'Bidirectional sync with Salesforce Health Cloud', enabled: false },
  { key: 'patientPortal',      label: 'Patient Portal', description: 'Self-service portal for enrolled patients', enabled: false },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'general' | 'features' | 'security'>('general');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [saved, setSaved] = useState(false);
  const [generalForm, setGeneralForm] = useState({
    name: '',
    displayName: '',
    timezone: '',
    locale: '',
    contactEmail: '',
  });

  const { data: tenant, isLoading, isError, error } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: fetchCurrentTenant,
  });
  const {
    data: featureFlags = {},
    isLoading: flagsLoading,
    isError: flagsError,
  } = useQuery({
    queryKey: ['tenant-feature-flags'],
    queryFn: fetchTenantFeatureFlags,
  });

  useEffect(() => {
    if (!tenant) return;
    setGeneralForm({
      name: tenant.name ?? '',
      displayName: tenant.displayName ?? '',
      timezone: tenant.timezone ?? '',
      locale: tenant.locale ?? '',
      contactEmail: tenant.contactEmail ?? '',
    });
  }, [tenant]);

  useEffect(() => {
    setFlags(INITIAL_FLAGS.map((flag) => ({
      ...flag,
      enabled: Boolean(featureFlags[flag.key]),
    })));
  }, [featureFlags]);

  const generalMutation = useMutation({
    mutationFn: () => updateCurrentTenant({
      name: generalForm.name.trim() || undefined,
      displayName: generalForm.displayName.trim() || undefined,
      timezone: generalForm.timezone.trim() || undefined,
      locale: generalForm.locale.trim() || undefined,
      contactEmail: generalForm.contactEmail.trim() || undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const enabledCount = useMemo(() => flags.filter((f) => f.enabled).length, [flags]);

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-3xl">
        <Card className="p-8">
          <p className="text-sm text-slate-500">Loading tenant settings from the backend…</p>
        </Card>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="space-y-5 max-w-3xl">
        <Card className="p-8">
          <p className="text-sm font-medium text-red-700">Unable to load tenant settings.</p>
          <p className="mt-1 text-sm text-slate-500">
            {error instanceof Error ? error.message : 'The tenant settings API request failed.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Tenant header */}
      <Card padding="sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-lg">{tenant.displayName || tenant.name}</h2>
              <Badge variant={tenant.status === 'ACTIVE' ? 'active' : 'warning'} dot>{tenant.status}</Badge>
            </div>
            <p className="text-sm text-slate-500">Tenant ID: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{tenant.id}</code></p>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium animate-fade-in">
              <Save className="h-4 w-4" />
              Saved!
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'general', label: 'General' },
          { key: 'features', label: 'Feature Flags' },
          { key: 'security', label: 'Security' },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Details</CardTitle>
              <CardSubtitle>Basic information about this tenant organisation</CardSubtitle>
            </CardHeader>
            <div className="space-y-4">
              <Input label="Organisation Name" value={generalForm.name} onChange={(e) => setGeneralForm((prev) => ({ ...prev, name: e.target.value }))} />
              <Input label="Display Name" value={generalForm.displayName} onChange={(e) => setGeneralForm((prev) => ({ ...prev, displayName: e.target.value }))} hint="Optional branded display name used in the UI" />
              <Input label="Slug / Identifier" value={tenant.slug} disabled hint="Used in API requests and URLs — cannot be changed after setup" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Country" value={tenant.country} disabled icon={<Globe className="h-4 w-4" />} />
                <Input label="Timezone" value={generalForm.timezone} onChange={(e) => setGeneralForm((prev) => ({ ...prev, timezone: e.target.value }))} icon={<Clock className="h-4 w-4" />} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Locale" value={generalForm.locale} onChange={(e) => setGeneralForm((prev) => ({ ...prev, locale: e.target.value }))} />
                <Input label="Contact Email" type="email" value={generalForm.contactEmail} onChange={(e) => setGeneralForm((prev) => ({ ...prev, contactEmail: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => generalMutation.mutate()} loading={generalMutation.isPending} icon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Defaults</CardTitle>
              <CardSubtitle>Notification thresholds are not exposed by the current backend settings API.</CardSubtitle>
            </CardHeader>
            <div className="space-y-4">
              <Input label="Task Overdue Alert (hours)" type="number" defaultValue="24" disabled />
              <Input label="High-Risk Patient Review Interval (days)" type="number" defaultValue="7" disabled />
              <Input label="Critical Patient Review Interval (days)" type="number" defaultValue="3" disabled />
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" disabled icon={<Save className="h-4 w-4" />}>Notification Updates Unavailable</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'features' && (
          <Card>
            <CardHeader action={<Badge variant="info">{enabledCount}/{flags.length} enabled</Badge>}>
              <CardTitle>Feature Flags</CardTitle>
              <CardSubtitle>Feature flags shown below are loaded from the backend. Updating them is not exposed by the current tenant API.</CardSubtitle>
            </CardHeader>
          {flagsLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading feature flags…</div>
          ) : flagsError ? (
            <div className="p-6 text-sm text-red-700">Unable to load feature flags from the backend.</div>
          ) : (
          <div className="space-y-1">
            {flags.map((flag) => (
              <div key={flag.key}
                className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-900">{flag.label}</p>
                    {flag.enabled && <Badge variant="success" size="sm">On</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 ml-6">{flag.description}</p>
                </div>
                <button
                  className="flex-shrink-0 transition-opacity opacity-60 cursor-not-allowed"
                  title="Read-only until a feature flag update API is available"
                  disabled
                >
                  {flag.enabled
                    ? <ToggleRight className="h-8 w-8 text-blue-500" />
                    : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                </button>
              </div>
            ))}
          </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" disabled icon={<Save className="h-4 w-4" />}>Feature Flag Updates Unavailable</Button>
          </div>
        </Card>
      )}

      {tab === 'security' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardSubtitle>OIDC/SSO values are loaded from the tenant profile. Updating them is not exposed by the current tenant API.</CardSubtitle>
            </CardHeader>
            <div className="space-y-4">
              <Input label="OIDC Issuer URL" value={tenant.oidcIssuer ?? ''} placeholder="https://auth.yourorg.com" icon={<Shield className="h-4 w-4" />} disabled />
              <Input label="Client ID" value={tenant.oidcClientId ?? ''} placeholder="padma-prod-client" disabled />
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">Client secret and SSO configuration updates are not exposed by the current backend settings API.</p>
              </div>
              <Input label="Client Secret" type="password" placeholder="••••••••••••••••" disabled />
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" disabled icon={<Save className="h-4 w-4" />}>Auth Config Updates Unavailable</Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardSubtitle>All configuration changes are immutably logged</CardSubtitle>
            </CardHeader>
            <div className="space-y-3">
              {[
                { action: 'Feature flag "realtime" enabled', user: 'Sarah Mitchell', time: '2026-04-04 09:32' },
                { action: 'Notification threshold updated', user: 'Sarah Mitchell', time: '2026-04-03 14:15' },
                { action: 'Role "care_coordinator" permissions updated', user: 'Sarah Mitchell', time: '2026-04-02 11:08' },
                { action: 'User Priya Sharma added to tenant', user: 'Sarah Mitchell', time: '2026-04-01 16:42' },
              ].map((log, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-b-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">{log.action}</p>
                    <p className="text-xs text-slate-400">{log.user}</p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">{log.time}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
