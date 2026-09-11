# Task List: Full-Stack Lightweight i18n for MSP Tray

## Phase 1: i18n Core Engine & Dictionaries

### Task 1.1: Create Type-Safe Translation Schema & Dictionary Tables
**Description:** Define the strict TypeScript `TranslationDictionary` interface in `packages/msp-tray/src/i18n/types.ts` and create exhaustive `locales/en_US.ts` and `locales/es_DO.ts` dictionaries covering all UI views and tray menus.
**Acceptance criteria:**
- [x] Define `TranslationDictionary` interface in `packages/msp-tray/src/i18n/types.ts` organized by namespaces (`common`, `header`, `gate`, `tickets`, `quickTicket`, `chat`, `attribution`, `trayMenu`).
- [x] Implement `locales/en_US.ts` with natural English copy.
- [x] Implement `locales/es_DO.ts` with standard Dominican Republic technical Spanish copy matching the portal standard.
- [x] Both dictionaries strictly implement `TranslationDictionary` with zero missing keys.
**Verification:**
- [x] TypeScript check compiles with zero errors (`npx tsc --noEmit` in `packages/msp-tray`).
**Dependencies:** None
**Files touched:**
- `packages/msp-tray/src/i18n/types.ts`
- `packages/msp-tray/src/i18n/locales/en_US.ts`
- `packages/msp-tray/src/i18n/locales/es_DO.ts`
**Estimated scope:** Medium (3 new files)

---

### Task 1.2: Build `I18nContext.tsx` Engine & `useI18n()` Hook
**Description:** Implement `I18nContext` provider in `packages/msp-tray/src/i18n/I18nContext.tsx` handling OS locale auto-detection (`navigator.language`), `localStorage` persistence, dot-notation key lookup, string interpolation (`{variable}`), and dynamic language switching.
**Acceptance criteria:**
- [x] Auto-detect initial locale from `localStorage.getItem('msp_tray_locale')` or `navigator.language` (`es*` -> `es_DO`, else `en_US`).
- [x] Export `I18nProvider` and custom hook `useI18n()`.
- [x] Implement `t(keyPath, params)` with support for nested keys (e.g. `'gate.expiresIn'`) and parameter interpolation.
- [x] Persist changes to `localStorage` on `setLocale()`.
- [x] Wrap top-level `<App />` in `main.tsx` with `<I18nProvider>`.
**Verification:**
- [x] TypeScript compilation succeeds.
**Dependencies:** Task 1.1
**Files touched:**
- `packages/msp-tray/src/i18n/I18nContext.tsx`
- `packages/msp-tray/src/i18n/index.ts`
- `packages/msp-tray/src/main.tsx`
**Estimated scope:** Medium (3 files)

---

## Checkpoint: i18n Engine Tested
- [x] Dictionaries compile and guarantee complete key parity
- [x] Provider mounts cleanly in root without breaking rendering

---

## Phase 2: Native Windows System Tray Synchronization

### Task 2.1: Implement `set_tray_language` in Tauri Backend
**Description:** In `packages/msp-tray/src-tauri/src/lib.rs`, store references to the tray menu items (`show`, `quit`) and tray tooltip, and implement a Tauri command `set_tray_language(locale: String)` that dynamically updates their labels based on the active locale.
**Acceptance criteria:**
- [x] Store tray `show` and `quit` `MenuItem` handles in a managed `TrayMenuState` struct in `lib.rs`.
- [x] Add Tauri command `set_tray_language(app: tauri::AppHandle, locale: String)` updating:
  - `show` menu item: `"Open Support Drawer"` (EN) / `"Abrir Asistente"` (ES)
  - `quit` menu item: `"Exit Support Assistant"` (EN) / `"Salir del Asistente"` (ES)
  - Tray icon tooltip: `"MSP Support Assistant"` (EN) / `"Asistente de Soporte MSP"` (ES)
- [x] Register `set_tray_language` in `tauri::generate_handler!`.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` compiles with zero warnings/errors.
**Dependencies:** None
**Files touched:**
- `packages/msp-tray/src-tauri/src/lib.rs`
**Estimated scope:** Small (1 file)

---

### Task 2.2: Connect Tauri Service Bridge & Synchronize on Language Change
**Description:** Expose `setTrayLanguage(locale: Locale)` in `services/tauri.ts` and call it from `I18nContext` whenever the locale is initialized or changed.
**Acceptance criteria:**
- [x] In `packages/msp-tray/src/services/tauri.ts`, export `setTrayLanguage(locale: string): Promise<void>`.
- [x] In `I18nContext.tsx`, call `setTrayLanguage(locale)` in an effect whenever `locale` updates.
**Verification:**
- [x] `npm --prefix packages/msp-tray run build` compiles with code 0.
**Dependencies:** Task 1.2, Task 2.1
**Files touched:**
- `packages/msp-tray/src/services/tauri.ts`
- `packages/msp-tray/src/i18n/I18nContext.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint: Native Tray Sync Verified
- [x] Tray menu items change language dynamically when switching in UI
- [x] Tray tooltip updates to match locale

---

## Phase 3: Component Localization & Header Switcher

### Task 3.1: Add Compact Language Switcher & Localize `Header.tsx`
**Description:** Update `packages/msp-tray/src/components/Header.tsx` to include an unobtrusive `EN` | `ES` segmented toggle button and replace all static strings with `t()`.
**Acceptance criteria:**
- [x] Compact `EN` | `ES` toggle pill button in header next to window control / vitals buttons with smooth active transition styling.
- [x] Clicking toggle switches locale immediately and persists choice.
- [x] Localize connection status ("Online", "Offline", "Connecting..."), tooltips, and header titles using `t('header.*')`.
**Verification:**
- [x] Visual verification of compact layout without overflowing the 420px drawer header.
**Dependencies:** Task 1.2
**Files touched:**
- `packages/msp-tray/src/components/Header.tsx`
**Estimated scope:** Small (1 file)

---

### Task 3.2: Localize `<ActivationGate />`
**Description:** Refactor `packages/msp-tray/src/components/ActivationGate.tsx` to use `t()` for all title, instruction, countdown timer, copy confirmation, and refresh button text.
**Acceptance criteria:**
- [x] Replace hardcoded English strings with `t('gate.*')`.
- [x] Countdown timer uses interpolated string `t('gate.expiresIn', { time: formatTtl(timeLeft) })`.
- [x] Copy button toggles `t('gate.copied')` vs `t('gate.copyPin')`.
- [x] Refresh button displays `t('gate.newPin')` / `t('gate.generating')`.
**Verification:**
- [x] Existing `ActivationGate.test.tsx` passes or is updated to assert localized rendering.
**Dependencies:** Task 1.2
**Files touched:**
- `packages/msp-tray/src/components/ActivationGate.tsx`
- `packages/msp-tray/src/components/ActivationGate.test.tsx`
**Estimated scope:** Small (2 files)

---

### Task 3.3: Localize QuickTicket, TicketList, LiveChat & Attribution Modals
**Description:** Localize remaining components (`QuickTicketModal.tsx`, `TicketList.tsx`, `LiveChatDrawer.tsx`, `AttributionModal.tsx`, `App.tsx`) to achieve 100% string coverage across the application.
**Acceptance criteria:**
- [x] In `QuickTicketModal.tsx`: Localize form labels (Subject, Priority, Description), priority values (Low, Medium, High, Critical), buttons, validation errors.
- [x] In `TicketList.tsx`: Localize empty states, tabs ("All", "Open", "Resolved"), status badges, action buttons.
- [x] In `LiveChatDrawer.tsx`: Localize chat input placeholder, typing status, banner status messages, send button.
- [x] In `AttributionModal.tsx`: Localize hardware specs labels (CPU, RAM, Disk, OS, IP, Hostname) and close button.
- [x] In `App.tsx`: Localize tab navigation labels and error toasts.
**Verification:**
- [x] `npm --prefix packages/msp-tray run build` compiles with 0 errors.
**Dependencies:** Task 1.2
**Files touched:**
- `packages/msp-tray/src/components/QuickTicketModal.tsx`
- `packages/msp-tray/src/components/TicketList.tsx`
- `packages/msp-tray/src/components/LiveChatDrawer.tsx`
- `packages/msp-tray/src/components/AttributionModal.tsx`
- `packages/msp-tray/src/App.tsx`
**Estimated scope:** Medium (5 files)

---

## Checkpoint: Complete UI Localization Verified
- [x] Every visible string in the desktop drawer is translated in both `en_US` and `es_DO`
- [x] No hardcoded English strings remain in UI components

---

## Phase 4: Automated Testing & Build Validation

### Task 4.1: Write Vitest Unit Tests for i18n
**Description:** Implement comprehensive test suite in `packages/msp-tray/src/i18n/I18nContext.test.tsx` testing dictionary completeness, fallback, interpolation, and language switching.
**Acceptance criteria:**
- [x] Test that `en_US` and `es_DO` dictionary objects have identical keys recursively (zero missing translations).
- [x] Test `t()` function string interpolation with parameters.
- [x] Test fallback to `en_US` when key or locale is unrecognized.
- [x] Test `localStorage` reading and writing.
**Verification:**
- [x] `npm --prefix packages/msp-tray run test:run` passes 100%.
**Dependencies:** Task 1.2, Task 3.3
**Files touched:**
- `packages/msp-tray/src/i18n/I18nContext.test.tsx`
**Estimated scope:** Small (1 new file)

---

### Task 4.2: Full Workspace Quality Gates & Production Build
**Description:** Verify `msp-tray` frontend bundle, Tauri release compilation, and existing unit tests pass cleanly.
**Acceptance criteria:**
- [x] `npm --prefix packages/msp-tray run test:run` passes with zero regressions.
- [x] `npm --prefix packages/msp-tray run build` builds Vite distribution cleanly.
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` finishes with zero errors.
**Verification:**
- [x] All automated commands exit with code 0.
**Dependencies:** Task 4.1
**Files touched:** None (verification)
**Estimated scope:** Verification (0 files modified)
