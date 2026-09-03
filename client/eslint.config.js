import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/incompatible-library': 'off',
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXOpeningElement[name.name="button"]',
          message:
            'Avoid using raw <button> elements in feature/page code. Use Button from "@/components/ui/button" instead.',
        },
        {
          selector: 'JSXOpeningElement[name.name="input"]',
          message:
            'Avoid using raw <input> elements in feature/page code. Use Input from "@/components/ui/input" instead.',
        },
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/\\b(bg|text|border)-(zinc-\\d+|white|black)\\b/]',
          message:
            'Avoid hardcoded zinc/white/black color classes. Prefer semantic tokens (bg-card, text-card-foreground, bg-background, border-border, etc.).',
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // =========================================================================
  // ARCHITECTURAL LAYERING & STRICT 1-WAY DEPENDENCY FLOW RULES
  // Primitives (L1) <--- Shared Blocks (L2) <--- Feature Components (L3) <--- Views/Pages (L4)
  // =========================================================================

  // Level 1: Primitives (/components/ui)
  // Pure presentation components. Zero awareness of database, API contracts, services, stores, feature components, or pages.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/shared/**',
                '@/components/layout/**',
                '@/components/auth/**',
                '@/components/billing/**',
                '@/components/checkout/**',
                '@/components/dashboard/**',
                '@/components/devices/**',
                '@/components/financial/**',
                '@/components/maintenance/**',
                '@/components/tickets/**',
                '@/components/users/**',
                '@/features/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
                '@/services/**',
                '@/store/**',
                '../shared/**',
                '../layout/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../tickets/**',
                '../users/**',
                '../../pages/**',
                '../../routes/**',
                '../../app/**',
                '../../services/**',
                '../../store/**',
              ],
              message:
                'Level 1 Primitives (/components/ui) must be pure presentation components and cannot import from Shared Blocks, Feature Components, Views/Pages, Services, or Stores.',
            },
          ],
        },
      ],
    },
  },

  // Level 2: Shared Blocks (/components/shared, /components/layout)
  // Reusable macro UI patterns. Domain-agnostic. Cannot import from Level 3 Feature components or Level 4 Views/Pages.
  {
    files: [
      'src/components/shared/**/*.{ts,tsx}',
      'src/components/layout/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/auth/**',
                '@/components/billing/**',
                '@/components/checkout/**',
                '@/components/dashboard/**',
                '@/components/devices/**',
                '@/components/financial/**',
                '@/components/maintenance/**',
                '@/components/tickets/**',
                '@/components/users/**',
                '@/features/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../tickets/**',
                '../users/**',
                '../../pages/**',
                '../../routes/**',
                '../../app/**',
              ],
              message:
                'Level 2 Shared Blocks (/components/shared, /components/layout) must remain domain-agnostic and cannot import from Level 3 Feature Components or Level 4 Views/Pages.',
            },
          ],
        },
      ],
    },
  },

  // Level 3: Feature Components (/components/[feature] or /features/[feature])
  // Domain-aware components. Cannot import from Level 4 Views/Pages.
  {
    files: [
      'src/components/auth/**/*.{ts,tsx}',
      'src/components/billing/**/*.{ts,tsx}',
      'src/components/checkout/**/*.{ts,tsx}',
      'src/components/dashboard/**/*.{ts,tsx}',
      'src/components/devices/**/*.{ts,tsx}',
      'src/components/financial/**/*.{ts,tsx}',
      'src/components/maintenance/**/*.{ts,tsx}',
      'src/components/tickets/**/*.{ts,tsx}',
      'src/components/users/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
                '../../pages/**',
                '../../routes/**',
                '../../app/**',
                '../pages/**',
                '../routes/**',
                '../app/**',
              ],
              message:
                'Level 3 Feature Components cannot import from Level 4 Views/Pages.',
            },
          ],
        },
      ],
    },
  },

  // Cross-Feature Isolation Rules for Level 3 modules (encapsulation enforcement):
  {
    files: ['src/components/auth/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/billing/**',
                '@/components/checkout/**',
                '@/components/dashboard/**',
                '@/components/devices/**',
                '@/components/financial/**',
                '@/components/maintenance/**',
                '@/components/tickets/**',
                '@/components/users/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../tickets/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/billing/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/auth/**',
                '@/components/dashboard/**',
                '@/components/devices/**',
                '@/components/financial/**',
                '@/components/maintenance/**',
                '@/components/tickets/**',
                '@/components/users/**',
                '../auth/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../tickets/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/devices/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/auth/**',
                '@/components/billing/**',
                '@/components/checkout/**',
                '@/components/dashboard/**',
                '@/components/financial/**',
                '@/components/maintenance/**',
                '@/components/tickets/**',
                '@/components/users/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../financial/**',
                '../maintenance/**',
                '../tickets/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/maintenance/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/auth/**',
                '@/components/billing/**',
                '@/components/checkout/**',
                '@/components/dashboard/**',
                '@/components/devices/**',
                '@/components/financial/**',
                '@/components/tickets/**',
                '@/components/users/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../tickets/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/financial/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/auth/**',
                '@/components/dashboard/**',
                '@/components/devices/**',
                '@/components/maintenance/**',
                '@/components/tickets/**',
                '@/components/users/**',
                '../auth/**',
                '../dashboard/**',
                '../devices/**',
                '../maintenance/**',
                '../tickets/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/tickets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/auth/**',
                '@/components/billing/**',
                '@/components/checkout/**',
                '@/components/dashboard/**',
                '@/components/financial/**',
                '@/components/maintenance/**',
                '@/components/users/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../financial/**',
                '../maintenance/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/users/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/auth/**',
                '@/components/billing/**',
                '@/components/checkout/**',
                '@/components/dashboard/**',
                '@/components/devices/**',
                '@/components/financial/**',
                '@/components/maintenance/**',
                '@/components/tickets/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../tickets/**',
                '@/pages/**',
                '@/routes/**',
                '@/app/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // ADR-002 ARCHITECTURAL BOUNDARY & ENTITY INVARIANT RULES
  // =========================================================================

  // 1. Forbid deep imports into colocated feature internals across the entire client codebase
  {
    files: [
      'src/pages/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/routes/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/services/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/features/*/**',
                '../features/*/**',
                '../../features/*/**',
                '../../../features/*/**',
                '../../*/components/**',
                '../../*/api/**',
                '../../*/hooks/**',
                '../../*/pages/**',
              ],
              message:
                'ADR-002 Violation: Deep imports into feature internals are prohibited. Import exclusively through the feature public gateway "@/features/<domain>".',
            },
          ],
        },
      ],
    },
  },

  // 2. Strictly ban declaring local backend entity interfaces or contract types in feature types.ts
  {
    files: ['src/features/**/types.ts', 'src/features/**/*.types.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'TSInterfaceDeclaration[id.name=/^(Ticket|Invoice|User|Plan|Subscription|Equipment|Expense|Device|Lead|AuditLog|Telemetry|Warranty|Component|Maintenance|Notification|Client|Tenant)(Detail|Item|Summary|Data|Row|Model|Schema)?$|.*(Input|Response|Contract|Payload|Filter|Filters|DTO|Record|Entity)$/]',
          message:
            'ADR-002 Invariant: Do not declare backend entity interfaces in feature types.ts. Import entity types and contracts directly from "@shared/contracts".',
        },
        {
          selector:
            'TSTypeAliasDeclaration[id.name=/^(Ticket|Invoice|User|Plan|Subscription|Equipment|Expense|Device|Lead|AuditLog|Telemetry|Warranty|Component|Maintenance|Notification|Client|Tenant)(Detail|Item|Summary|Data|Row|Model|Schema)?$|.*(Input|Response|Contract|Payload|Filter|Filters|DTO|Record|Entity)$/]',
          message:
            'ADR-002 Invariant: Do not declare backend entity types in feature types.ts. Import entity types and contracts directly from "@shared/contracts".',
        },
      ],
    },
  },
])
