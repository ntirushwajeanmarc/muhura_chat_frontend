import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import './index.css';

const AppInner = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-wa-muted">
        Loading...
      </div>
    );
  }
  return user ? (
    <>
      <ChatPage />
      <InstallPwaPrompt />
    </>
  ) : (
    <AuthPage />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
