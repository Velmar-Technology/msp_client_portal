const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "off"
    },
  },
  // Clean Architecture Layering Rules:
  // 1. Service Layer (Use Cases): Cannot import Express, raw DB pool, or controllers
  {
    files: ["src/modules/**/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["express", "@shared/db", "../controllers/**", "@/modules/**/controllers/**"],
              message: "Service layer must not import Express or raw DB pool directly. Access DB through repositories."
            }
          ]
        }
      ]
    }
  },
  // 2. Controller Layer (Interface Adapters): Cannot import raw DB pool or repositories directly
  {
    files: ["src/modules/**/controllers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@shared/db", "../repositories/**", "@/modules/**/repositories/**"],
              message: "Controller layer must not import raw DB pool or repositories directly. All data access flows through services."
            }
          ]
        }
      ]
    }
  },
  // 3. Shared Entities & Types: Pure domain layer without outward dependencies
  {
    files: ["src/shared/types/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["express", "@shared/db", "@/modules/**", "../modules/**"],
              message: "Pure domain types must not have outward dependencies on frameworks, services, or controllers."
            }
          ]
        }
      ]
    }
  },
  // 4. Module Gateway Isolation (AGENTS.md Section 3.6):
  // Cross-module imports of internal repositories, controllers, services, or routes are FORBIDDEN.
  // Modules must strictly consume other domains via public gateway: @modules/<domain>.
  ...[
    "auth",
    "billing",
    "crm",
    "equipment",
    "notifications",
    "rmm",
    "subscriptions",
    "system",
    "tickets"
  ].map((domain) => {
    const otherDomains = [
      "auth",
      "billing",
      "crm",
      "equipment",
      "notifications",
      "rmm",
      "subscriptions",
      "system",
      "tickets"
    ].filter((d) => d !== domain);

    const restrictedGroups = otherDomains.flatMap((other) => [
      `@modules/${other}/repositories/**`,
      `@modules/${other}/controllers/**`,
      `@modules/${other}/services/**`,
      `@modules/${other}/routes/**`,
      `@modules/${other}/schemas/**`,
      `@/modules/${other}/repositories/**`,
      `@/modules/${other}/controllers/**`,
      `@/modules/${other}/services/**`,
      `@/modules/${other}/routes/**`,
      `@/modules/${other}/schemas/**`,
      `../${other}/**`,
      `../../${other}/**`,
      `../../../${other}/**`
    ]);

    return {
      files: [`src/modules/${domain}/**/*.ts`],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: restrictedGroups,
                message: `Module Gateway Rule (AGENTS.md Sec 3.6): Cross-module internal access forbidden. Consume '${domain}' external dependencies strictly via public gateway: @modules/<other_domain>.`
              }
            ]
          }
        ]
      }
    };
  }),
  {
    ignores: ["dist/**", "node_modules/**"],
  }
];

