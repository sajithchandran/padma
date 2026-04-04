'use client';

import { useState } from 'react';
import { Building2, Globe, Clock, Shield, Zap, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MOCK_TENANT } from '@/lib/mock-data';

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
  const [tab, setTab] = useState<'general' | 'features' | 'security'>('general');
  const [flags, setFlags] = useState<FeatureFlag[]>(INITIAL_FLAGS);
  const [saved, setSaved] = useState(false);

  function toggleFlag(key: string) {
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
  }

  async function handleSave() {
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
              <h2 className="font-bold text-slate-900 text-lg">{MOCK_TENANT.name}</h2>
              <Badge variant="active" dot>Active</Badge>
            </div>
            <p className="text-sm text-slate-500">Tenant ID: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{MOCK_TENANT.id}</code></p>
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
              <Input label="Organisation Name" defaultValue={MOCK_TENANT.name} />
              <Input label="Slug / Identifier" defaultValue={MOCK_TENANT.slug} hint="Used in API requests and URLs — cannot be changed after setup" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Country" defaultValue={MOCK_TENANT.country} icon={<Globe className="h-4 w-4" />} />
                <Input label="Timezone" defaultValue={MOCK_TENANT.timezone} icon={<Clock className="h-4 w-4" />} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={handleSave} icon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Defaults</CardTitle>
              <CardSubtitle>Configure global notification thresholds for this tenant</CardSubtitle>
            </CardHeader>
            <div className="space-y-4">
              <Input label="Task Overdue Alert (hours)" type="number" defaultValue="24" />
              <Input label="High-Risk Patient Review Interval (days)" type="number" defaultValue="7" />
              <Input label="Critical Patient Review Interval (days)" type="number" defaultValue="3" />
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={handleSave} icon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'features' && (
        <Card>
          <CardHeader action={<Badge variant="info">{flags.filter((f) => f.enabled).length}/{flags.length} enabled</Badge>}>
            <CardTitle>Feature Flags</CardTitle>
            <CardSubtitle>Enable or disable platform features for this tenant. Changes take effect immediately.</CardSubtitle>
          </CardHeader>
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
                  onClick={() => toggleFlag(flag.key)}
                  className="flex-shrink-0 transition-opacity hover:opacity-80"
                  title={flag.enabled ? 'Disable' : 'Enable'}
                >
                  {flag.enabled
                    ? <ToggleRight className="h-8 w-8 text-blue-500" />
                    : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} icon={<Save className="h-4 w-4" />}>Save Feature Flags</Button>
          </div>
        </Card>
      )}

      {tab === 'security' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardSubtitle>OIDC/SSO configuration for this tenant</CardSubtitle>
            </CardHeader>
            <div className="space-y-4">
              <Input label="OIDC Issuer URL" placeholder="https://auth.yourorg.com" icon={<Shield className="h-4 w-4" />} />
              <Input label="Client ID" placeholder="padma-prod-client" />
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">Client secret is stored encrypted. Leave blank to keep existing secret.</p>
              </div>
              <Input label="Client Secret" type="password" placeholder="••••••••••••••••" />
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={handleSave} icon={<Save className="h-4 w-4" />}>Save Auth Config</Button>
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
