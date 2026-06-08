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

  const submitLabel = loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account';

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain chat-wallpaper bg-wa-dark">
      <div className="px-4 py-5 pb-safe sm:px-6 sm:py-8 sm:pb-10">
        <div className="w-full max-w-md mx-auto bg-wa-panel border border-wa-border rounded-2xl p-5 sm:p-10 shadow-2xl">
          <div className="text-center mb-5 sm:mb-7">
            <img src="/logo.png" alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mx-auto mb-2 sm:mb-3 object-contain" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">EganirA</h1>
            <p className="text-wa-muted text-sm mt-1">Connect with your friends</p>
          </div>

          <div className="flex bg-wa-surface rounded-lg p-1 mb-4 sm:mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m ? 'bg-wa-accent text-white' : 'text-wa-muted hover:text-slate-200'
                }`}
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="flex flex-col gap-3 sm:gap-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-wa-muted mb-1.5">Username</label>
                  <input
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
                  <label className="block text-xs font-medium text-wa-muted mb-1.5">
                    Surname <span className="text-wa-muted/70">(optional)</span>
                  </label>
                  <input
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
              <label className="block text-xs font-medium text-wa-muted mb-1.5">Email</label>
              <input
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
                <label className="block text-xs font-medium text-wa-muted mb-1.5">
                  Mobile number <span className="text-wa-muted/70">(optional)</span>
                </label>
                <input
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
              <label className="block text-xs font-medium text-wa-muted mb-1.5">Password</label>
              <input
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
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2.5 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-60 rounded-lg text-white font-semibold text-sm transition-colors"
              disabled={loading}
            >
              {submitLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
