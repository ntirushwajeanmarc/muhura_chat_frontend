import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const AppInner = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-wa-muted" role="status">
        Loading...
      </div>
    );
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
