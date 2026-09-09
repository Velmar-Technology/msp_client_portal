import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from "@/App";
import "@/i18n";
import "@/index.css";

// Defer Grafana Faro RUM until the main thread is idle so the SDK never
// blocks first paint (it is emitted as its own lazy vendor-rum chunk).
const deferredInitRum = (): void => {
  import('@/telemetry/faro')
    .then((m) => m.initFaro())
    .catch(() => {});
};

if ('requestIdleCallback' in window) {
  (window as unknown as { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => void })
    .requestIdleCallback(deferredInitRum, { timeout: 3000 });
} else {
  setTimeout(deferredInitRum, 3000);
}

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
