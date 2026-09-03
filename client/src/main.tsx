import { initFaro } from '@/telemetry/faro';
import { initDatadogRum } from '@/telemetry/datadog';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from "@/App";
import "@/i18n";
import "@/index.css";

// Initialize Grafana Faro Real User Monitoring (RUM) & Datadog RUM with Session Replay
initFaro();
initDatadogRum();

// Register Service Worker for PWA Offline Shell Capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
