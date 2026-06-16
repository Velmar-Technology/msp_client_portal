---
name: Professional MSP Core
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  h1:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  h2:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h3:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  h1-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 2rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style
This design system is built upon the principles of clarity, efficiency, and industrial-grade reliability. It adopts a **Modern Corporate** aesthetic heavily influenced by the "shadcn/ui" philosophy: a lean, component-driven approach that prioritizes functional utility over decorative flair. 

The target audience consists of IT professionals and system administrators who require high information density without cognitive overload. The UI evokes a sense of "technical calm"—it is predictable, responsive, and stays out of the user's way. The visual style uses a white-base minimalism with high-contrast accents and precise, subtle borders to define structure.

## Colors
The palette is rooted in a Slate/Zinc spectrum, ensuring a neutral environment where data remains the focal point.
- **Primary (#0f172a):** A deep Zinc-900 blue-black used for high-importance text, primary actions, and structural anchors.
- **Accent (#6366f1):** A crisp Indigo used sparingly for focus states, active indicators, and secondary calls to action.
- **Surface:** The background is a pure `#ffffff`, providing maximum contrast for text.
- **Borders:** Consistent use of `#e2e8f0` for structural separation and `#cbd5e1` for interactive input states.
- **Semantic Colors:** Use standard accessible red for destructive actions, amber for warnings, and emerald for success, all desaturated to match the Slate tones.

## Typography
The system utilizes a dual-font approach for maximum precision. **Geist** is used for headlines and labels to provide a technical, modern feel with its slightly condensed proportions. **Inter** is used for body copy to ensure long-form legibility and cross-platform consistency.

- **Tracking:** Use negative letter-spacing on larger headings to maintain a tight, professional appearance.
- **Scale:** Maintain a strict hierarchy where labels (buttons, tags, nav items) use the medium weight of Geist, while body text remains in regular weight Inter.
- **Technical Data:** Use monospaced fonts (JetBrains Mono) for IP addresses, IDs, and code snippets within the UI.

## Layout & Spacing
This design system employs a **Fixed/Fluid Hybrid Grid**. Content is primarily contained within a max-width of 1440px for desktop, centered with 2rem margins. 

- **Grid:** Use a 12-column grid for complex dashboard layouts. Gutters are fixed at 1rem.
- **Spacing Rhythm:** Based on a 4px (0.25rem) baseline. All margins and paddings must be multiples of 4.
- **Mobile:** Transition to a single-column layout with 1rem side margins. Use drawer overlays for navigation instead of horizontal bars.

## Elevation & Depth
In alignment with the "shadcn" aesthetic, this design system avoids heavy shadows. Depth is achieved through **Tonal Layering** and **Subtle Outlines**.

- **Cards:** Use a 1px border (`#e2e8f0`) with no shadow for base state. A very soft, diffused shadow (`0 1px 3px 0 rgba(0, 0, 0, 0.1)`) may be used to indicate interactivity or floating elements (like dropdowns).
- **Modals:** Use a centered overlay with a backdrop blur (8px) to focus the user's attention.
- **Separators:** Use thin, horizontal or vertical lines in `#e2e8f0` to group related content without adding visual bulk.

## Shapes
The design system follows a consistent "Round 8" rule. A corner radius of **0.5rem (8px)** is the standard for almost all UI components, including buttons, cards, and input fields.

- **Small Components:** Tags and chips may use a slightly smaller radius (4px) if they are nested within larger 8px containers.
- **Nested Elements:** When an element is nested inside another rounded container (e.g., a button inside a card padding), the inner radius should be slightly smaller to maintain visual concentricity.

## Components
- **Buttons:** Solid primary buttons use `#0f172a` with white text. Ghost buttons use a transparent background with a subtle hover state of `#f1f5f9`. All buttons use 0.5rem rounding and `label-md` typography.
- **Inputs:** High-contrast borders (`#cbd5e1`). On focus, the border shifts to the Indigo accent with a subtle ring effect.
- **Cards:** Flat white background, 1px `#e2e8f0` border, 0.5rem corner radius. Card headers should use `h3` or `label-md` with a subtle bottom border.
- **Chips/Badges:** Small, Geist-based labels with low-opacity background tints (e.g., a light indigo tint for informational tags).
- **Data Tables:** Clean, borderless rows with a 1px divider between items. Use Geist for table headers in all-caps or medium weight to distinguish from data.
- **Navigation:** Vertical sidebar for desktop with active states indicated by a subtle background shift to `#f1f5f9` and a 2px indigo left-border indicator.