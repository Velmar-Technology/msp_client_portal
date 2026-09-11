# Implementation Plan: Full-Stack Lightweight i18n for MSP Tray

## Overview
Equip the MSP Tray Assistant with a zero-dependency, type-safe localization engine supporting both English (`en_US`) and Dominican Spanish (`es_DO`). The implementation covers the complete desktop experience: automatic Windows OS locale detection with persistent override, a sleek language switcher in the drawer header, 100% localized React drawer views (Activation Gate, Tickets, Live Chat, Vitals), and synchronized native Windows system tray context menus and tooltips.

---

## Architecture Decisions

1. **Zero-Dependency Type-Safe Translation Schema (`types.ts`):**
   - Define a strictly typed TypeScript interface `TranslationDictionary` for all UI strings.
   - Implement `en_US.ts` and `es_DO.ts` satisfying `TranslationDictionary`. TypeScript compile-time checking guarantees 100% parity—no missing keys or runtime translation crashes.
   - Zero external libraries (< 3KB bundle size, 0ms load penalty).

2. **Hierarchical Locale Resolution:**
   - Priority 1: User selection stored in `localStorage.getItem('msp_tray_locale')`.
   - Priority 2: Windows OS browser locale via `navigator.language` (`es-*` $\rightarrow$ `es_DO`, otherwise `en_US`).
   - Default: `en_US`.

3. **String Interpolation Helper (`t(key, params)`):**
   - Dot-notated string key path lookup (e.g. `t('gate.expiresIn', { time: '04:12' })`) with simple string template replacement (`{time}`).

4. **Dual-Stack Native Synchronization:**
   - React `I18nContext` calls Tauri command `invoke('set_tray_language', { locale })` on mount and on language change.
   - Rust Tauri backend dynamically mutates tray menu item texts and tray tooltip via `tauri::menu::MenuItem` handles.

---

## Task Breakdown Index

### Phase 1: i18n Core Engine & Dictionaries
- [ ] Task 1.1: Create type-safe translation schema & dictionary tables (`types.ts`, `locales/en_US.ts`, `locales/es_DO.ts`)
- [ ] Task 1.2: Build `I18nContext.tsx` with OS detection, interpolation, and `useI18n()` hook
- **Checkpoint: i18n Engine Tested**

### Phase 2: Native Windows System Tray Synchronization
- [ ] Task 2.1: Implement `set_tray_language` command in Tauri backend (`src-tauri/src/lib.rs`)
- [ ] Task 2.2: Connect Tauri service bridge (`services/tauri.ts`) and trigger sync from `I18nContext`
- **Checkpoint: Native Tray Sync Verified**

### Phase 3: Component Localization & Header Switcher
- [ ] Task 3.1: Add compact `EN` | `ES` language switcher and localize `Header.tsx`
- [ ] Task 3.2: Localize `ActivationGate.tsx`
- [ ] Task 3.3: Localize `QuickTicketModal.tsx`, `TicketList.tsx`, `LiveChatDrawer.tsx`, and `AttributionModal.tsx`
- **Checkpoint: Complete UI Localization Verified**

### Phase 4: Automated Testing & Build Validation
- [ ] Task 4.1: Write Vitest tests for dictionary parity, interpolation, and locale switching
- [ ] Task 4.2: Execute tray test suite and production build quality gates
- **Checkpoint: Release Ready**

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Dynamic Tauri tray menu update not supported on older Webview2 runtimes | Low | Tauri v2 `MenuItem::set_text` modifies the Win32 HMENU directly via Windows API, independent of Webview2. |
| Incomplete dictionary keys when new features are added | Medium | Strict TypeScript typing (`const enUS: TranslationDictionary = { ... }`) ensures compile error if any key is missing. |
| Layout breakage due to Spanish text length expansion | Medium | Tailwind text truncation, flexible flexbox headers, and tested drawer layout width (420px). |
