'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, Globe, Clock, Shield, Zap, Save, 
  ToggleLeft, ToggleRight, CheckCircle2, ChevronRight,
  User, Activity, Settings, Bell, Lock, Database, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  fetchCurrentTenant,
  fetchTenantFeatureFlags,
  updateCurrentTenant,
} from '@/services/tenants.service';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    timezone: '',
    locale: '',
    contactEmail: '',
    pathwayCodeFormat: 'PW-{YYYY}-{SEQ4}',
  });

  const { data: tenant, isLoading, isError, error } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: fetchCurrentTenant,
  });
  
  const { data: featureFlags = {}, isLoading: flagsLoading } = useQuery({
    queryKey: ['tenant-feature-flags'],
    queryFn: fetchTenantFeatureFlags,
  });

  useEffect(() => {
    if (!tenant) return;
    setForm({
      name: tenant.name ?? '',
      displayName: tenant.displayName ?? '',
      timezone: tenant.timezone ?? '',
      locale: tenant.locale ?? '',
      contactEmail: tenant.contactEmail ?? '',
      pathwayCodeFormat: typeof tenant.featureFlags?.pathwayCodeFormat === 'string'
        ? tenant.featureFlags.pathwayCodeFormat
        : 'PW-{YYYY}-{SEQ4}',
    });
  }, [tenant]);

  useEffect(() => {
    setFlags(INITIAL_FLAGS.map((f) => ({ ...f, enabled: Boolean(featureFlags[f.key]) })));
  }, [featureFlags]);

  const mutation = useMutation({
    mutationFn: () => updateCurrentTenant({
      name: form.name.trim() || undefined,
      displayName: form.displayName.trim() || undefined,
      timezone: form.timezone.trim() || undefined,
      locale: form.locale.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      pathwayCodeFormat: form.pathwayCodeFormat.trim() || 'PW-{YYYY}-{SEQ4}',
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const enabledCount = useMemo(() => flags.filter((f) => f.enabled).length, [flags]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl animate-pulse">
        <div className="h-24 bg-card rounded-3xl border border-border" />
        <div className="h-64 bg-card rounded-3xl border border-border" />
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-3xl border border-border">
         <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
         <h3 className="text-lg font-bold text-foreground">Configuration Error</h3>
         <p className="text-sm text-muted-foreground mt-2">{error instanceof Error ? error.message : 'API access failed'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Organisation Identity Header */}
      <Card padding="none" className="overflow-hidden border-border/60">
        <div className="p-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent flex flex-col sm:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-premium">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl font-bold text-foreground font-display tracking-tight">{tenant.displayName || tenant.name}</h2>
              <Badge variant={tenant.status === 'ACTIVE' ? 'active' : 'warning'} dot>{tenant.status}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground font-bold uppercase tracking-widest">
               <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {tenant.slug}</span>
               <span className="h-1 w-1 rounded-full bg-border" />
               <span className="flex items-center gap-1.5 font-mono lowercase bg-muted px-2 py-0.5 rounded-lg border border-border/40">ID: {tenant.id.slice(0, 8)}...</span>
            </div>
          </div>
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold shadow-sm">
                <CheckCircle2 className="h-4 w-4" /> Changes Synchronized
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Settings Navigation */}
      <div className="flex gap-1.5 bg-muted/40 p-1.5 rounded-2xl w-fit border border-border/50">
        {[
          { key: 'general', label: 'Identity', icon: <Settings className="h-3.5 w-3.5" /> },
          { key: 'features', label: 'Capacities', icon: <Zap className="h-3.5 w-3.5" /> },
          { key: 'security', label: 'Compliance', icon: <Shield className="h-3.5 w-3.5" /> },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              tab === t.key ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            )}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'general' && (
          <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Organisation Core</CardTitle>
                <CardSubtitle>Critical identity and localization settings for the entire tenant</CardSubtitle>
              </CardHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Registry Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input label="White-label Brand Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} hint="Used in communications and portals" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Primary Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} icon={<Clock className="h-4 w-4" />} />
                  <Input label="System Locale" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} icon={<Globe className="h-4 w-4" />} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Input label="Admin Contact Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} icon={<Activity className="h-4 w-4" />} />
                   <Input label="Case ID Format" value={form.pathwayCodeFormat} onChange={(e) => setForm({ ...form, pathwayCodeFormat: e.target.value })} hint="Template for Case unique identifiers" />
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <Button onClick={() => mutation.mutate()} loading={mutation.isPending} icon={<Save className="h-4 w-4" />} className="px-8">
                  Update Registry Configuration
                </Button>
              </div>
            </Card>

            <Card className="border-border/60 opacity-60">
              <CardHeader>
                <CardTitle>System Thresholds</CardTitle>
                <CardSubtitle>Alerting and notification delays (Configured via Backend Policy)</CardSubtitle>
              </CardHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5 grayscale">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Overdue Trigger</label>
                   <div className="h-10 rounded-xl bg-muted/30 border border-border flex items-center px-4 text-sm font-bold text-foreground/40 italic">24 Hours</div>
                </div>
                <div className="space-y-1.5 grayscale">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Review Frequency</label>
                   <div className="h-10 rounded-xl bg-muted/30 border border-border flex items-center px-4 text-sm font-bold text-foreground/40 italic">7 Days</div>
                </div>
                <div className="space-y-1.5 grayscale">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Clinical Escalation</label>
                   <div className="h-10 rounded-xl bg-muted/30 border border-border flex items-center px-4 text-sm font-bold text-foreground/40 italic">3 Days</div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'features' && (
          <motion.div key="features" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-border/60">
              <CardHeader action={<Badge variant="info">{enabledCount} / {flags.length} active</Badge>}>
                <CardTitle>Internal Capacities</CardTitle>
                <CardSubtitle>Optional system modules and integrations loaded via Tenant Core</CardSubtitle>
              </CardHeader>
              <div className="divide-y divide-border/40">
                {flags.map((f) => (
                  <div key={f.key} className="py-6 flex items-start gap-4">
                    <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0", f.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40")}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-3">
                          <p className="font-bold text-foreground font-display">{f.label}</p>
                          {f.enabled && <Badge variant="active" size="xs">Operating</Badge>}
                       </div>
                       <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                    </div>
                    <div className="opacity-40 grayscale cursor-not-allowed">
                       {f.enabled ? <ToggleRight className="h-10 w-10 text-primary" /> : <ToggleLeft className="h-10 w-10 text-muted-foreground" />}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Auth & Continuity</CardTitle>
                <CardSubtitle>OAuth Provider and OIDC discovery settings</CardSubtitle>
              </CardHeader>
              <div className="space-y-6">
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                    <Shield className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                       <p className="text-xs font-bold text-foreground uppercase tracking-tight">Active SSO Channel</p>
                       <p className="text-xs text-muted-foreground mt-0.5">Primary authentication via <span className="font-bold text-primary">OpenID Connect</span></p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-6">
                    <Input label="Issuer Authority" value={tenant.oidcIssuer ?? 'https://oidc.padma.care'} disabled icon={<Lock className="h-4 w-4" />} />
                    <Input label="Service Client ID" value={tenant.oidcClientId ?? 'padma_prod_tenant'} disabled icon={<Database className="h-4 w-4" />} />
                 </div>
              </div>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Management Audit</CardTitle>
                <CardSubtitle>Recent state transitions and permission changes</CardSubtitle>
              </CardHeader>
              <div className="space-y-4">
                {[
                  { op: 'Identity Update', user: 'Admin', icon: <Settings className="h-3 w-3" />, time: 'Just now' },
                  { op: 'Permission Grant', user: 'System', icon: <Lock className="h-3 w-3" />, time: '2h ago' },
                  { op: 'Capacity Enable', user: 'Internal', icon: <Zap className="h-3 w-3" />, time: '1d ago' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/10 border border-border/40 hover:bg-muted/20 transition-colors">
                    <div className="h-8 w-8 rounded-xl bg-muted border border-border flex items-center justify-center">
                       {l.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold text-foreground">{l.op}</p>
                       <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-tighter">Initiated by {l.user}</p>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">{l.time}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
