'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart, Shield, Zap, Users, ArrowRight,
  CheckCircle2, Lock, AlertCircle, Eye, EyeOff, Mail,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

const FEATURES = [
  { icon: <Users className="h-5 w-5" />, title: 'Population Health', desc: 'Monitor high-risk patient cohorts in real-time' },
  { icon: <Zap className="h-5 w-5" />, title: 'Smart Pathways', desc: 'Evidence-based clinical pathways with automated tasks' },
  { icon: <Shield className="h-5 w-5" />, title: 'HIPAA Compliant', desc: 'Enterprise-grade security and audit logging' },
];

const DEMO_EMAIL    = 'admin@padma.dev';
const DEMO_PASSWORD = 'Padma@123';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      const result = await authService.login({ email: email.trim(), password });
      setAuth(result.user, result.tenant, result.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  async function handleSSO() {
    setSsoLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 800));
    setSsoLoading(false);
    setError('OIDC / SSO is not configured yet. Use email + password below.');
  }

  const isFormValid = email.trim().length > 0 && password.length > 0;

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 0,transparent 50%),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 0,transparent 50%)`,
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

        {/* Stats */}
        <div className="relative mt-8 flex items-center gap-8 pt-6 border-t border-slate-700/60">
          {[
            { value: '1,247', label: 'Active Patients' },
            { value: '384',   label: 'Open Pathways' },
            { value: '98.2%', label: 'Uptime SLA' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" strokeWidth={2.5} />
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

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* SSO */}
            <button
              type="button"
              onClick={handleSSO}
              disabled={ssoLoading || loading}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ssoLoading
                ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <Lock className="h-4 w-4" />}
              {ssoLoading ? 'Redirecting…' : 'Sign in with SSO / OIDC'}
              {!ssoLoading && <ArrowRight className="h-4 w-4 ml-auto" />}
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or sign in with email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Email + Password form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@organisation.com"
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm transition-all duration-150 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {loading
                  ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : null}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {/* Demo hint */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Demo credentials</p>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Fill in
                </button>
              </div>
              <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-slate-600 font-mono">{DEMO_EMAIL}</p>
                <p className="text-xs text-slate-600 font-mono">{DEMO_PASSWORD}</p>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {['Secured with bcrypt', 'HIPAA compliant', 'Role-based access'].map((item) => (
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
