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
                '@/components/users/**',
                '@/features/**',
                '@/pages/**',
                '@/routes/**',
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
                '../users/**',
                '../../pages/**',
                '../../routes/**',
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
                '@/components/users/**',
                '@/features/**',
                '@/pages/**',
                '@/routes/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../users/**',
                '../../pages/**',
                '../../routes/**',
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
                '../../pages/**',
                '../../routes/**',
                '../pages/**',
                '../routes/**',
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
                '@/components/users/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
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
                '@/components/users/**',
                '../auth/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
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
                '@/components/users/**',
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
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
                '@/components/users/**',
                '../auth/**',
                '../dashboard/**',
                '../devices/**',
                '../maintenance/**',
                '../users/**',
                '@/pages/**',
                '@/routes/**',
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
                '../auth/**',
                '../billing/**',
                '../checkout/**',
                '../dashboard/**',
                '../devices/**',
                '../financial/**',
                '../maintenance/**',
                '@/pages/**',
                '@/routes/**',
              ],
              message:
                'Feature components must not import directly from inside peer feature modules or pages. Interact through shared services or public hooks.',
            },
          ],
        },
      ],
    },
  },
])

