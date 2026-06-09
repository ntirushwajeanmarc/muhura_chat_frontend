import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-wa-dark p-6">
          <div className="bg-wa-panel border border-wa-border rounded-2xl p-8 max-w-sm text-center shadow-2xl">
            <div className="text-3xl mb-3" aria-hidden>⚠️</div>
            <h1 className="text-lg font-semibold text-slate-100">Something went wrong</h1>
            <p className="text-sm text-wa-muted mt-2 leading-relaxed">
              The app hit an unexpected error. Reload to continue.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full py-3 rounded-xl bg-wa-accent hover:bg-wa-accent-hover text-white font-semibold text-sm"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
