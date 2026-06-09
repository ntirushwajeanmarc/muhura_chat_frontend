import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-slate-100 text-sm outline-none focus:border-wa-accent transition-colors';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', surname: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password, form.phone, form.surname);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
              onClick={() => setMode(m)}
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
            <label htmlFor="auth-password" className="block text-xs font-medium text-wa-muted mb-1.5">Password</label>
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
