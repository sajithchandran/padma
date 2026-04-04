'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Shield, Zap, Users, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { MOCK_USER, MOCK_TENANT } from '@/lib/mock-data';

const FEATURES = [
  { icon: <Users className="h-5 w-5" />, title: 'Population Health', desc: 'Monitor high-risk patient cohorts in real-time' },
  { icon: <Zap className="h-5 w-5" />, title: 'Smart Pathways', desc: 'Evidence-based clinical pathways with automated tasks' },
  { icon: <Shield className="h-5 w-5" />, title: 'HIPAA Compliant', desc: 'Enterprise-grade security and audit logging' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleSSO() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    alert('OIDC/SSO integration coming soon. Use the demo login below.');
  }

  async function handleDemo() {
    setDemoLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setAuth(MOCK_USER, MOCK_TENANT, 'demo-token-xyz');
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ height: '100dvh' }}>
      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-blue-700/5 blur-2xl" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 0, transparent 50%),
              repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 0, transparent 50%)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Heart className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-lg tracking-wide">Padma</p>
            <p className="text-blue-300 text-xs">Care Coordination Platform</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative mt-16 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Built for chronic disease management teams
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Coordinate care.<br />
            <span className="text-blue-400">Improve outcomes.</span>
          </h1>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-sm">
            Padma brings together clinical pathways, task management and patient engagement
            in a single platform designed for multidisciplinary care teams.
          </p>

          {/* Features */}
          <div className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative mt-8 flex items-center gap-8 pt-6 border-t border-slate-700/60">
          {[
            { value: '1,247', label: 'Active Patients' },
            { value: '384', label: 'Open Pathways' },
            { value: '98.2%', label: 'Uptime SLA' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Heart className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-slate-900 font-bold">Padma</p>
              <p className="text-slate-500 text-xs">Care Coordination Platform</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 text-sm mt-1">Sign in to your organisation account</p>
            </div>

            {/* SSO Button */}
            <button
              type="button"
              onClick={handleSSO}
              disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {loading ? 'Redirecting to SSO…' : 'Sign in with SSO / OIDC'}
              {!loading && <ArrowRight className="h-4 w-4 ml-auto" />}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Demo Login */}
            <button
              type="button"
              onClick={handleDemo}
              disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {demoLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
              ) : (
                <Users className="h-4 w-4 text-slate-500" />
              )}
              {demoLoading ? 'Signing in…' : 'Continue as Demo User'}
            </button>

            {/* Trust indicators */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {[
                'Secured with OIDC',
                'HIPAA compliant',
                'Role-based access',
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-slate-400">
            By signing in you agree to Padma&apos;s{' '}
            <span className="text-blue-600 cursor-pointer hover:underline">Terms of Service</span>{' '}
            and{' '}
            <span className="text-blue-600 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
