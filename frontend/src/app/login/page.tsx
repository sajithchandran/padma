'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart, Shield, Zap, Users, ArrowRight,
  CheckCircle2, Lock, AlertCircle, Eye, EyeOff, Mail, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <div className="min-h-screen flex overflow-hidden bg-[#fafafa] dark:bg-slate-950" style={{ height: '100dvh' }}>
      {/* ── Left Panel (Brand & Social Proof) ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] flex-col p-12 relative overflow-hidden bg-[#0a0c10]">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-black opacity-90" />
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full" />
        
        {/* Subtle Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Logo */}
        <div className="relative group flex items-center gap-3 select-none">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform duration-500 group-hover:scale-110">
            <Heart className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-white font-black text-2xl tracking-tighter leading-none">Padma</h2>
            <p className="text-blue-400/60 text-[10px] uppercase font-black tracking-[0.2em] mt-1">Care Coordination</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative mt-20 flex-1 flex flex-col justify-center max-w-lg">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-300 text-xs font-bold mb-8 backdrop-blur-md shadow-xl w-fit">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
            <span className="uppercase tracking-widest text-[10px]">Trusted by 200+ Clinical Teams</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
            Clinical precision.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-300">
              Human-centric care.
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg leading-relaxed font-medium mb-12">
            The intelligent platform for multidisciplinary chronic disease management and automated care pathways.
          </p>

          <div className="grid gap-6">
            {FEATURES.map((f, i) => (
              <div 
                key={f.title} 
                className="group flex items-start gap-5 p-4 rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-white/10 flex items-center justify-center text-blue-400 transition-transform duration-300 group-hover:scale-110">
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-white font-bold text-base">{f.title}</h4>
                  <p className="text-slate-500 text-sm mt-1 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Proof Stats */}
        <div className="relative mt-auto pt-10 border-t border-white/10 flex items-center justify-between">
          {[
            { value: '1.2M+', label: 'Interventions' },
            { value: '380+',   label: 'Clinics' },
            { value: '99.9%', label: 'Compliance' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white font-black text-2xl tracking-tight">{s.value}</p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel (Login Form) ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-y-auto bg-slate-50 dark:bg-slate-900/40">
        {/* Subtle background glow for dark mode */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-xl opacity-20 pointer-events-none hidden dark:block">
          <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full" />
        </div>

        <div className="w-full max-w-[440px] relative z-10">
          {/* Mobile logo only visible on small screens */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10 pb-6 border-b border-slate-200">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
              <Heart className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter">Padma</h2>
          </div>

          {/* Main Card */}
          <div className={cn(
            "rounded-3xl border transition-all duration-500 p-10",
            "bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl shadow-2xl",
            "border-white dark:border-white/5 shadow-slate-200/50 dark:shadow-black/20"
          )}>
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Login</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Access your clinical dashboard</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>
              </div>
            )}

            {/* SSO / Identity Provider */}
            <button
              type="button"
              onClick={handleSSO}
              disabled={ssoLoading || loading}
              className="group relative w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:active:scale-100"
            >
              {ssoLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Shield className="h-5 w-5 opacity-70 transition-transform group-hover:scale-110" />
              )}
              {ssoLoading ? 'Authenticating...' : 'Enterprise SSO Login'}
              {!ssoLoading && <ArrowRight className="h-4 w-4 ml-auto opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />}
            </button>

            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">or email</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Traditional Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative group/field">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within/field:text-blue-500 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organisation.com"
                    disabled={loading}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-base font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">
                  Password
                </label>
                <div className="relative group/field">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within/field:text-blue-500 pointer-events-none" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full h-14 pl-12 pr-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-base font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl hover:bg-slate-800 dark:hover:bg-blue-50 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2 mt-4"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {loading ? 'Processing...' : 'Sign In'}
              </button>
            </form>

            {/* Crystal Demo Hint Container */}
            <div className="mt-8 p-6 rounded-[2rem] bg-indigo-500/[0.03] border border-indigo-500/10 backdrop-blur-sm group/demo">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60">Sandbox Environment</p>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors underline decoration-2 underline-offset-4"
                >
                  Auto-fill
                </button>
              </div>
              <div className="space-y-1.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-indigo-500/5">
                  <span className="opacity-50">{DEMO_EMAIL}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-indigo-500/5">
                  <span className="opacity-50">••••••••</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-relaxed">
            By accessing this platform, you agree to comply with HIPAA guidelines and Padma's{' '}
            <span className="text-blue-500 cursor-pointer border-b border-blue-500/30 hover:border-blue-500 transition-all">Security Protocol</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
