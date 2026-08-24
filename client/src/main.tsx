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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
