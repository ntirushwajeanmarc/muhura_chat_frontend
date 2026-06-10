import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset } from '../api/auth';

const FORGOT_COOLDOWN_SEC = 60;

const inputClass =
  'w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-slate-100 text-sm outline-none focus:border-wa-accent transition-colors';

export default function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ username: '', surname: '', email: '', password: '', phone: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const forgotSubmittingRef = useRef(false);
  const { login, register } = useAuth();

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
    setForgotSent(false);
    setForgotCooldown(0);
    forgotSubmittingRef.current = false;
  };

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else if (mode === 'register') {
        await register(form.username, form.email, form.password, form.phone, form.surname);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const startForgotCooldown = () => {
    setForgotCooldown(FORGOT_COOLDOWN_SEC);
    const timer = setInterval(() => {
      setForgotCooldown((sec) => {
        if (sec <= 1) {
          clearInterval(timer);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (forgotSubmittingRef.current || forgotCooldown > 0) return;

    const email = (forgotEmail || form.email || '').trim();
    if (!email) {
      setError('Email is required');
      return;
    }

    forgotSubmittingRef.current = true;
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await requestPasswordReset(email);
      setForgotSent(true);
      setInfo(
        data.message
          || 'If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.'
      );
      startForgotCooldown();
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED';
      setError(
        isTimeout
          ? 'The server took too long to respond. Please wait a minute before trying again.'
          : err.response?.data?.error || 'Could not send reset email'
      );
    } finally {
      setLoading(false);
      forgotSubmittingRef.current = false;
    }
  };

  if (mode === 'forgot') {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain chat-wallpaper bg-wa-dark">
        <div className="flex min-h-full items-center justify-center px-4 py-6 pb-safe sm:p-6 sm:pb-10">
          <div className="bg-wa-panel border border-wa-border rounded-2xl p-6 sm:p-10 w-full max-w-md shadow-2xl my-4">
            <div className="text-center mb-7">
              <img src="/logo.png" alt="EganirA logo" className="w-16 h-16 rounded-2xl mx-auto mb-3 object-contain" />
              <h1 className="text-2xl font-bold text-slate-100">Forgot password?</h1>
              <p className="text-wa-muted text-sm mt-1">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-medium text-wa-muted mb-1.5">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  className={inputClass}
                  value={forgotEmail || form.email}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    if (forgotSent) setForgotSent(false);
                  }}
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={loading || forgotCooldown > 0}
                />
              </div>
              {error && (
                <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2.5 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {info && (
                <div role="status" className="bg-wa-accent/10 border border-wa-accent/30 text-wa-accent px-3.5 py-2.5 rounded-lg text-sm leading-relaxed">
                  {info}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || forgotCooldown > 0}
                className="py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-60 rounded-lg text-white font-semibold text-sm transition-colors"
              >
                {loading
                  ? 'Sending…'
                  : forgotCooldown > 0
                    ? `Resend in ${forgotCooldown}s`
                    : forgotSent
                      ? 'Send again'
                      : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-wa-muted hover:text-slate-200 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain chat-wallpaper bg-wa-dark">
      <div className="flex min-h-full items-center justify-center px-4 py-6 pb-safe sm:p-6 sm:pb-10">
      <div className="bg-wa-panel border border-wa-border rounded-2xl p-6 sm:p-10 w-full max-w-md shadow-2xl my-4">
        <div className="text-center mb-7">
          <img src="/logo.png" alt="EganirA logo" className="w-16 h-16 rounded-2xl mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-slate-100">EganirA</h1>
          <p className="text-wa-muted text-sm mt-1">Connect with your friends</p>
        </div>

        <div className="flex bg-wa-surface rounded-lg p-1 mb-6" role="tablist" aria-label="Authentication mode">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-controls="auth-form-panel"
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === m ? 'bg-wa-accent text-white' : 'text-wa-muted hover:text-slate-200'
              }`}
              onClick={() => switchMode(m)}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form id="auth-form-panel" role="tabpanel" onSubmit={handle} className="flex flex-col gap-4">
          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="auth-username" className="block text-xs font-medium text-wa-muted mb-1.5">Username</label>
                <input
                  id="auth-username"
                  type="text"
                  placeholder="your_name"
                  className={inputClass}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="auth-surname" className="block text-xs font-medium text-wa-muted mb-1.5">
                  Surname <span className="text-wa-muted/70">(optional)</span>
                </label>
                <input
                  id="auth-surname"
                  type="text"
                  placeholder="e.g. Mukamana"
                  className={inputClass}
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                  autoComplete="family-name"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-wa-muted mb-1.5">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="student@uni.edu"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-phone" className="block text-xs font-medium text-wa-muted mb-1.5">
                Mobile number <span className="text-wa-muted/70">(optional)</span>
              </label>
              <input
                id="auth-phone"
                type="tel"
                placeholder="+250 7XX XXX XXX"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
              />
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-password" className="block text-xs font-medium text-wa-muted">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(form.email);
                    switchMode('forgot');
                  }}
                  className="text-xs text-wa-accent hover:text-wa-accent-hover transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2.5 rounded-lg text-sm"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            className="py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-60 rounded-lg text-white font-semibold text-sm transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
