# Idea: Lightweight Full-Stack i18n for MSP Tray Assistant

## Problem Statement
How might we deliver a seamless, bilingual (`en_US` and `es_DO`) desktop experience in `msp-tray` across both the interactive React drawer and the native Windows system tray shell, with zero external dependencies and zero-latency locale switching?

---

## Recommended Direction

### 1. Architectural Blueprint
We implement a zero-dependency, type-safe localization layer using a lightweight custom React Context and TypeScript translation dictionaries:

```
┌────────────────────────────────────────────────────────┐
│                   Desktop User                         │
└───────────────────────────┬────────────────────────────┘
                            │ (Toggles EN / ES in Header)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  I18nProvider                          │
│  - Bootstraps from localStorage (fallback: OS locale)  │
│  - Exposes { locale, setLocale, t } via useI18n()      │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     React Webview UI      │ │   Tauri Rust Backend      │
│  - ActivationGate.tsx     │ │  invoke("set_tray_lang")  │
│  - Header.tsx (toggle)    │ │                           │
│  - QuickTicketModal.tsx   │ │  Tray Context Menu:       │
│  - TicketList.tsx         │ │  - "Abrir Asistente"      │
│  - LiveChatDrawer.tsx     │ │  - "Salir del Asistente"  │
│  - AttributionModal.tsx   │ │                           │
└───────────────────────────┘ └───────────────────────────┘
```

### 2. Core Pillars
1. **Type-Safe Dictionary (`types.ts`):** A strictly typed interface ensuring 100% parity between `en_US` and `es_DO`. Any missing translation key causes an immediate TypeScript compilation error.
2. **Zero-Dependency Engine (< 3KB):** Avoids adding `i18next`, `react-i18next`, or heavy parser runtimes. A lightweight React hook handles interpolated variables (e.g. `t('gate.expiresIn', { time: '04:52' })`) with simple string interpolation.
3. **OS Locale Auto-Detection + Persistent Override:**
   - Initial run inspects `navigator.language`: if starting with `es` (e.g. `es-DO`, `es-419`, `es-ES`), defaults to `es_DO`; otherwise `en_US`.
   - User choices are saved in `localStorage.setItem('msp_tray_locale', ...)` and take precedence.
4. **Synchronized Native Tray Shell:**
   - Invoking `setLocale('es_DO')` calls Tauri's `invoke('set_tray_language', { locale: 'es_DO' })`.
   - The Rust Tauri backend dynamically updates the tray tooltip (`"Asistente de Soporte MSP"`) and the right-click menu items (`"Abrir Asistente"`, `"Salir"`).

---

## Key Assumptions to Validate

- [ ] **Tauri v2 Dynamic Menu Mutation:** Validate that `tauri::menu::MenuItem::set_text` can dynamically update existing menu items on the system tray instance without recreating the tray icon.
- [ ] **Webview2 LocalStorage Durability:** Confirm that `localStorage` persistence in Tauri v2 survives application restarts and machine reboots on Windows 10/11.
- [ ] **Terminology Consistency:** Ensure terminology matches the canonical Dominican Spanish vocabulary in `client/src/locales/es_DO.json` (*Equipo*, *Ticket*, *Estado*, *Prioridad*).

---

## MVP Scope

### Included in MVP
1. **Localization Core (`packages/msp-tray/src/i18n/`):**
   - `types.ts`: Translation schema definition.
   - `locales/en_US.ts`: English string table.
   - `locales/es_DO.ts`: Dominican Spanish string table.
   - `index.tsx`: `I18nProvider`, `useI18n` hook, and locale resolver.
2. **Interactive Header Switcher (`Header.tsx`):**
   - Compact toggle button in the header toolbar (`EN` / `ES`) with active state styling.
3. **Component UI Translation:**
   - `Header.tsx`: Online/offline status, vitals, actions.
   - `ActivationGate.tsx`: PIN activation instructions, countdown, refresh button, copied feedback.
   - `QuickTicketModal.tsx`: Priority levels, title/description placeholders, submit/cancel buttons.
   - `TicketList.tsx`: Tab labels, status badges, timestamps, empty state.
   - `LiveChatDrawer.tsx`: Input placeholder, send button, connection banners.
   - `AttributionModal.tsx`: Hardware vitals labels, IP, hostname.
4. **Native Tray Synchronization (`src-tauri/src/lib.rs`):**
   - Tauri command `set_tray_language` updating system tray labels and tooltip in real time.
5. **Automated Unit Tests:**
   - Vitest tests verifying locale switching, fallback behavior, interpolation, and complete dictionary key coverage.

---

## Not Doing (and Why)

- **External i18next Dependency:** Not adding `i18next` or `react-i18next`. A compiled TypeScript dictionary gives total type safety, autocompletion, zero bundle bloat, and no asynchronous fetch overhead.
- **Dynamic Cloud Translation Loading:** Not downloading translations at runtime over HTTP/WebSocket. The desktop tray must work 100% offline even if the local network is disconnected.
- **Machine Translation for User Ticket Text:** Tickets submitted in Spanish will remain in Spanish for technicians. Language translation of user-generated content is an MSP server/AI feature, not a tray UI responsibility.
- **Multi-Language Beyond EN/ES:** Only supporting `en_US` and `es_DO`, matching the enterprise MSP portal's target operating markets (US and Dominican Republic).

---

## Open Questions & Verification
- **Default fallback on unbound machines:** If Windows OS locale is Spanish (`es-DO`), the Workstation Activation Gate will immediately welcome the user in Spanish on first install.
- **Initial Native Menu Language:** On app launch, Rust inspects the default system locale or waits for the first webview handshake to align tray menu text.
