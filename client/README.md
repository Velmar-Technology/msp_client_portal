# MSP Client Portal — Frontend Client Application

The frontend client portal is built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **shadcn/ui**, and **Zustand**.

---

## 📁 Directory Structure

```
client/src/
├── assets/             # Brand logos, hero images, and static graphics
├── components/         # Feature-specific components
│   └── ui/             # Core shadcn/ui primitives (Button, Card, Tabs, Select, etc.)
├── config/             # Environment, API, and runtime configurations
├── constants/          # Static constants and lookups
├── email-templates/    # Master Email Design System & transactional email templates
│   ├── tokens.ts       # Centralized design tokens (colors, typography, spacing, shadows)
│   ├── types.ts        # TypeScript prop types
│   ├── components.tsx  # Shared email primitives (Greeting, InfoCard, DetailRow, etc.)
│   ├── EmailWrapper.tsx# Outermost responsive layout shell
│   └── *.tsx           # Individual template implementations
├── hooks/              # Custom React hooks
├── locales/            # Internationalization dictionaries (en_US.json, es_DO.json)
├── pages/              # Top-level route page view implementations
│   ├── NotificationPreferencesPage/ # Notification channels, history & Email Templates Gallery
│   └── ...             # Dashboard, Tickets, Billing, Plans, Devices, etc.
├── routes/             # Route hierarchies (_public, _auth, _app)
├── services/           # Axios HTTP client service adapters
├── store/              # Zustand global application state stores
└── test/               # Unit and component testing utilities
```

---

## 🎨 Design System & UI Architecture

1. **shadcn/ui Primitives**: All components strictly consume primitives from `src/components/ui/`.
2. **Internationalization (i18n)**: All user-facing strings are localized via `react-i18next` (`useTranslation`) in both `en_US` and `es_DO`.
3. **Form Validation**: Strict schema validation using **Zod** (`safeParse`) on all form dialogs.
4. **Email Templates Design System**: Located in `src/email-templates/`, providing token-driven, homogeneous email components previewed live in the **Notifications & Preferences** gallery.

---

## 🛠️ Scripts & Development

- `npm run dev`: Start local Vite development server (`http://localhost:5173`)
- `npm run build`: Typecheck and produce optimized production bundle (`tsc -b && vite build`)
- `npm run test`: Execute test suites with Vitest
