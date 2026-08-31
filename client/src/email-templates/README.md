# Velmar Technology — Email Design System & Templates

This directory houses the **Homogeneous Email Design System** for the Velmar Technology MSP Client Portal. It provides unified, responsive, cross-client email components for both live client-side preview and server-side transactional email dispatch.

---

## Architecture

The system is structured as a **modular token-driven component hierarchy**:

```
client/src/email-templates/
├── tokens.ts                   # Master design token system (Single Source of Truth)
├── types.ts                    # TypeScript interfaces & prop definitions
├── components.tsx              # Reusable sub-component primitives (Greeting, InfoCard, DetailRow, etc.)
├── EmailWrapper.tsx            # Outermost layout shell (Header, Accent Bar, Body, Footer)
├── PasswordResetTemplate.tsx   # Password reset email component
├── OTPTemplate.tsx             # Account verification OTP email component
├── TicketCreatedTemplate.tsx   # Support ticket opened & updates email component
├── InvoiceReminderTemplate.tsx # Outstanding invoice payment reminder email component
├── index.ts                    # Public gateway / barrel export
└── README.md                   # System documentation
```

---

## Design Tokens (`tokens.ts`)

All visual styling (colors, font sizes, spacing, borders, shadows, and radii) is governed strictly by design tokens:

### Brand & Surface Palette

- **Brand Header Background**: `#0C4A6E` (Deep Ocean Blue) with linear gradient to `#064E73`
- **Brand Subtitle Highlight**: `#38BDF8` (Sky Blue)
- **Primary CTA Button**: `#2563EB` (Action Blue) with `0 4px 12px rgba(37, 99, 235, 0.20)` shadow
- **Surface / Background**: `#F8FAFC`
- **Card Background**: `#FFFFFF`
- **Border**: `#E2E8F0`
- **Text Headings**: `#0F172A`
- **Text Body**: `#334155`
- **Text Muted / Disclaimers**: `#94A3B8`

### Template Accent Bars

Every email features a 3px colored accent bar immediately beneath the header:
| Template | Accent Color | Hex |
| :--- | :--- | :--- |
| **Password Reset** | Action Blue | `#2563EB` |
| **OTP Verification** | Sky Accent | `#38BDF8` |
| **Ticket Opened / Updated** | Ocean Mid | `#0369A1` |
| **Invoice Due / Reminder** | Warning Amber | `#D97706` |
| **Quotation** | Deep Ocean | `#0C4A6E` |

---

## Shared Sub-Components (`components.tsx`)

| Component       | Description                                                                 |
| :-------------- | :-------------------------------------------------------------------------- |
| `Greeting`      | Standardized bilingual greeting (`Hello {name},` / `Hola {name},`)          |
| `BodyText`      | Main paragraph text with `muted` and `small` variants                       |
| `InfoCard`      | Structured container with colored top accent bar and bordered title section |
| `DetailRow`     | Key-value data row with consistent label column width and divider lines     |
| `Badge`         | Inline rounded status or category pill                                      |
| `Callout`       | Alert callout box with icon (`warning`, `danger`, `info`, `muted`)          |
| `HighlightCode` | Centered 32px monospace code display for 6-digit OTP codes                  |
| `FallbackLink`  | Raw URL container with copy-paste instructions and expiration warnings      |
| `Disclaimer`    | Subtle 12px legal and security disclaimer at the bottom of the content      |

---

## Live Interactive UI Gallery

The client portal includes a built-in live gallery located in the **[Notifications & Preferences](/notifications)** view (`NotificationPreferencesPage`):

- **Live Preview Container**: Displays rendered React templates in real-time.
- **Template Switcher**: Toggle instantly between Password Reset, OTP, Ticket, and Invoice templates.
- **Language Switcher**: Toggle between English (`en_US`) and Spanish (`es_DO`) to preview bilingual strings.

---

## Server-Side Alignment (`emailService.ts`)

The backend delivery engine at [`server/src/shared/utils/emailService.ts`](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/shared/utils/emailService.ts) generates identical HTML for outbound Nodemailer/SMTP emails using the exact same tokens, layout structure, and design rules.
