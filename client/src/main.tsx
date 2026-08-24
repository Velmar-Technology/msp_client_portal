import { initFaro } from '@/telemetry/faro';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from "@/App";
import "@/i18n";
import "@/index.css";

// Initialize Grafana Faro Real User Monitoring (RUM)
initFaro();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
