import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { setTrayLanguage, logClientEvent } from './services/tauri';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const errorMsg = event.error?.message || event.message || 'Unknown window error';
    const stack = event.error?.stack;
    logClientEvent('error', `Window Error: ${errorMsg}`, stack).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason instanceof Error ? event.reason.message : String(event.reason);
    const stack = event.reason instanceof Error ? event.reason.stack : undefined;
    logClientEvent('warn', `Unhandled Promise Rejection: ${reasonMsg}`, stack).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider onLocaleChange={setTrayLanguage}>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);


