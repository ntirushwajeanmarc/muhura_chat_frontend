import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChatPage from './pages/ChatPage';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function getResetTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('reset_token')?.trim() || null;
}

function clearResetTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('reset_token')) return;
  url.searchParams.delete('reset_token');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next || '/');
}

const AppInner = () => {
  const { user, loading } = useAuth();
  const [resetToken, setResetToken] = useState(getResetTokenFromUrl);

  const finishReset = useCallback(() => {
    clearResetTokenFromUrl();
    setResetToken(null);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-wa-muted" role="status">
        Loading...
      </div>
    );
  }

  if (resetToken) {
    return <ResetPasswordPage token={resetToken} onDone={finishReset} />;
  }

  return user ? <ChatPage /> : <AuthPage />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppInner />
          <InstallPwaPrompt />
          <PwaUpdatePrompt />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
