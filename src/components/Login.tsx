import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from './supabaseClient';

export function Login({ onLogin }: { onLogin: (session: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) onLogin(data.session);
      } else {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b626472b/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email, password, name }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Signup failed');

        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        if (data.session) onLogin(data.session);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-zinc-800/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-zinc-700/20 blur-3xl" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-2xl mb-5 -rotate-3">
            <ShieldCheck className="w-7 h-7 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isLogin ? 'Welcome back' : 'Join the team'}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400 font-medium">
            {isLogin ? 'Sign in to your workspace' : 'Create your account to get started'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-7 shadow-2xl">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-red-700 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <Field label="Full Name">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-all"
                  placeholder="Your full name"
                />
              </Field>
            )}

            <Field label="Email">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-all"
                placeholder="name@company.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-all"
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-zinc-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-zinc-500">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                onClick={switchMode}
                className="font-bold text-zinc-900 hover:text-zinc-600 underline underline-offset-2 transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Trygc OPS Command · Internal workspace
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black uppercase tracking-wider text-zinc-500">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}
