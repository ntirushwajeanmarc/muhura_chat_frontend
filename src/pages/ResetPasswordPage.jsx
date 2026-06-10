import React, { useState, useEffect } from 'react';
import { verifyResetToken, resetPassword } from '../api/auth';

const inputClass =
  'w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-slate-100 text-sm outline-none focus:border-wa-accent transition-colors';

export default function ResetPasswordPage({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await verifyResetToken(token);
        if (!cancelled) {
          setValid(true);
        }
      } catch {
        if (!cancelled) {
          setValid(false);
          setError('This reset link is invalid or has expired. Request a new one from the sign-in page.');
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(token, password);
      setSuccess(data.message || 'Password updated successfully.');
      setTimeout(() => onDone?.(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
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
            <h1 className="text-2xl font-bold text-slate-100">New password</h1>
            <p className="text-wa-muted text-sm mt-1">Choose a strong password for your account</p>
          </div>

          {checking ? (
            <p className="text-center text-wa-muted text-sm py-8" role="status">Checking reset link…</p>
          ) : !valid ? (
            <div className="text-center">
              <p className="text-red-400 text-sm mb-6" role="alert">{error}</p>
              <button
                type="button"
                onClick={onDone}
                className="py-3 px-6 bg-wa-accent hover:bg-wa-accent-hover rounded-lg text-white font-semibold text-sm"
              >
                Back to sign in
              </button>
            </div>
          ) : success ? (
            <div className="text-center">
              <p className="text-wa-accent text-sm mb-4" role="status">{success}</p>
              <p className="text-wa-muted text-xs">Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="reset-password" className="block text-xs font-medium text-wa-muted mb-1.5">
                  New password
                </label>
                <input
                  id="reset-password"
                  type="password"
                  placeholder="At least 8 characters"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-xs font-medium text-wa-muted mb-1.5">
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  placeholder="Repeat password"
                  className={inputClass}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2.5 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-60 rounded-lg text-white font-semibold text-sm transition-colors"
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
              <button
                type="button"
                onClick={onDone}
                className="text-sm text-wa-muted hover:text-slate-200 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
