import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADR-002: Frontend Colocated Feature Architecture Invariant Test Suite
 *
 * Enforces structural invariants defined in ADR-002:
 * 1. Public API Gateway (Every domain in client/src/features/ MUST have an index.ts).
 * 2. Ban on Deep Imports (Nobody may import feature internals from outside the domain).
 * 3. Single Contract Truth (types.ts is restricted exclusively to ephemeral UI state).
 */

const FEATURES_DIR = path.resolve(__dirname, '../../src/features');
const SRC_DIR = path.resolve(__dirname, '../../src');

function getAllFiles(dir: string, extensionRegex: RegExp = /\.(ts|tsx)$/): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, extensionRegex));
    } else if (extensionRegex.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getFeatureDirectories(): string[] {
  if (!fs.existsSync(FEATURES_DIR)) return [];
  return fs
    .readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

describe('ADR-002: Frontend Colocated Feature Architecture Invariants', () => {
  const featureDirs = getFeatureDirectories();

  it('verifies features directory exists and contains recognized domain slices', () => {
    expect(featureDirs.length).toBeGreaterThan(0);
  });

  describe('Invariant Rule 1: Public Gateway Requirement (index.ts)', () => {
    it.each(featureDirs)('feature "%s" must expose an index.ts public gateway', (featureName) => {
      const indexPath = path.join(FEATURES_DIR, featureName, 'index.ts');
      expect(
        fs.existsSync(indexPath),
        `Feature "${featureName}" is missing a public gateway file at features/${featureName}/index.ts`,
      ).toBe(true);

      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(
        content.trim().length,
        `Feature "${featureName}/index.ts" must not be empty; it should export public components and hooks`,
      ).toBeGreaterThan(0);
    });
  });

  describe('Invariant Rule 2: Ban on Cross-Feature Deep Imports', () => {
    const allSourceFiles = getAllFiles(SRC_DIR);

    it('prohibits deep imports like "@/features/<name>/..." or relative cross-feature deep paths', () => {
      const violations: string[] = [];
      const deepImportAliasRegex = /from\s+['"]@\/features\/([^/'"]+)\/([^'"]+)['"]/g;
      const relativeCrossFeatureRegex =
        /from\s+['"](?:\.\.\/)+([a-zA-Z0-9_-]+)\/(components|api|hooks|pages)\/([^'"]+)['"]/g;

      for (const file of allSourceFiles) {
        // Skip test files from checking internal imports
        if (file.includes('.test.') || file.includes('.spec.')) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const relativeFilePath = path.relative(SRC_DIR, file).replace(/\\/g, '/');

        // Check 1: Alias deep imports '@/features/domain/subpath'
        let match: RegExpExecArray | null;
        while ((match = deepImportAliasRegex.exec(content)) !== null) {
          violations.push(
            `${relativeFilePath} imports deep path "${match[0]}". Use public gateway "@/features/${match[1]}" instead.`,
          );
        }

        // Check 2: Relative cross-feature deep imports
        if (relativeFilePath.startsWith('features/')) {
          const currentFeature = relativeFilePath.split('/')[1];
          let relMatch: RegExpExecArray | null;
          while ((relMatch = relativeCrossFeatureRegex.exec(content)) !== null) {
            const targetDomain = relMatch[1];
            if (targetDomain !== currentFeature && targetDomain !== '..' && targetDomain !== '.') {
              violations.push(
                `${relativeFilePath} imports cross-feature relative path "${relMatch[0]}". Import through "@/features/${targetDomain}".`,
              );
            }
          }
        }
      }

      expect(
        violations,
        `Found ${violations.length} ADR-002 deep import violations:\n${violations.join('\n')}`,
      ).toEqual([]);
    });
  });

  describe('Invariant Rule 3: Single Contract Truth in types.ts', () => {
    const allTypeFiles = getAllFiles(FEATURES_DIR, /types\.ts$/);

    it('forbids declaring backend entity or contract schemas in feature types.ts', () => {
      const violations: string[] = [];
      const forbiddenDeclarationRegex =
        /(?:interface|type)\s+([A-Za-z0-9_]+(?:Input|Response|Contract|Payload|Filter|Filters|DTO|Record|Entity)|(?:Ticket|Invoice|User|Plan|Subscription|Equipment|Expense|Device|Lead|AuditLog|Telemetry|Warranty|Component|Maintenance|Notification|Client|Tenant)(?:Detail|Item|Summary|Data|Row|Model|Schema)?)\b/g;

      for (const file of allTypeFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativeFilePath = path.relative(FEATURES_DIR, file).replace(/\\/g, '/');

        let match: RegExpExecArray | null;
        while ((match = forbiddenDeclarationRegex.exec(content)) !== null) {
          violations.push(
            `features/${relativeFilePath} declares forbidden contract type "${match[1]}". Import contract schemas directly from "@shared/contracts".`,
          );
        }
      }

      expect(
        violations,
        `Found ${violations.length} ADR-002 duplicate contract violations:\n${violations.join('\n')}`,
      ).toEqual([]);
    });
  });

  describe('Invariant Rule 4: Zero Deprecated Compatibility Shims (Purged State)', () => {
    it('ensures deprecated horizontal directories and compatibility shims do not exist', () => {
      const forbiddenPaths = [
        path.join(SRC_DIR, 'hooks/queries'),
        path.join(SRC_DIR, 'hooks/devices'),
        path.join(SRC_DIR, 'services/subscriptionService.ts'),
        path.join(SRC_DIR, 'services/planService.ts'),
        path.join(SRC_DIR, 'services/equipmentService.ts'),
        path.join(SRC_DIR, 'services/ticketService.ts'),
        path.join(SRC_DIR, 'services/crmService.ts'),
        path.join(SRC_DIR, 'services/rmmService.ts'),
        path.join(SRC_DIR, 'services/maintenanceService.ts'),
        path.join(SRC_DIR, 'services/earningsService.ts'),
        path.join(SRC_DIR, 'services/expenseService.ts'),
        path.join(SRC_DIR, 'services/userService.ts'),
        path.join(SRC_DIR, 'services/authService.ts'),
        path.join(SRC_DIR, 'services/systemService.ts'),
        path.join(SRC_DIR, 'services/invoiceService.ts'),
        path.join(SRC_DIR, 'services/notificationPreferenceService.ts'),
        path.join(SRC_DIR, 'services/notificationService.ts'),
        path.join(SRC_DIR, 'components/maintenance'),
        path.join(SRC_DIR, 'components/financial'),
        path.join(SRC_DIR, 'components/users'),
        path.join(SRC_DIR, 'hooks/useMaintenance.ts'),
        path.join(SRC_DIR, 'hooks/useRmmDashboard.ts'),
        path.join(SRC_DIR, 'hooks/usePatchManagementModal.ts'),
        path.join(SRC_DIR, 'hooks/useFinancialDashboard.ts'),
        path.join(SRC_DIR, 'hooks/useUserManagement.ts'),
        path.join(SRC_DIR, 'hooks/useAdminDashboard.ts'),
        path.join(SRC_DIR, 'hooks/useClientDashboard.ts'),
        path.join(SRC_DIR, 'hooks/useProfile.ts'),
        path.join(SRC_DIR, 'hooks/useApiStatus.ts'),
        path.join(SRC_DIR, 'hooks/useNotificationPreferences.ts'),
        path.join(SRC_DIR, 'hooks/useNotificationHistory.ts'),
        path.join(SRC_DIR, 'pages/BillingPage'),
        path.join(SRC_DIR, 'pages/DevicesPage'),
        path.join(SRC_DIR, 'pages/PlanEditorPage'),
        path.join(SRC_DIR, 'pages/PlansPage'),
        path.join(SRC_DIR, 'pages/TicketDetailPage'),
        path.join(SRC_DIR, 'pages/TicketsPage'),
        path.join(SRC_DIR, 'pages/CRMPage'),
        path.join(SRC_DIR, 'pages/CRMCustomPlanPage'),
        path.join(SRC_DIR, 'pages/MaintenancePage'),
        path.join(SRC_DIR, 'pages/FinancialPage'),
        path.join(SRC_DIR, 'pages/UserManagementPage'),
        path.join(SRC_DIR, 'pages/LoginPage'),
        path.join(SRC_DIR, 'pages/RegisterPage'),
        path.join(SRC_DIR, 'pages/DashboardPage'),
        path.join(SRC_DIR, 'pages/TechDashboardPage'),
        path.join(SRC_DIR, 'pages/ProfilePage'),
        path.join(SRC_DIR, 'pages/NotificationPreferencesPage'),
        path.join(SRC_DIR, 'pages/PasswordManagerPage'),
        path.join(SRC_DIR, 'pages/ApiStatusPage'),
      ];

      const existingForbidden = forbiddenPaths.filter((p) => fs.existsSync(p));
      expect(
        existingForbidden,
        `Found purged deprecated shims still existing in filesystem:\n${existingForbidden.join('\n')}`,
      ).toEqual([]);
    });

    it('ensures no source file contains legacy ADR-002 deprecation markers', () => {
      const allFiles = getAllFiles(SRC_DIR);
      const lingeringMarkers: string[] = [];

      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('Deprecated per ADR-002')) {
          lingeringMarkers.push(path.relative(SRC_DIR, file).replace(/\\/g, '/'));
        }
      }

      expect(
        lingeringMarkers,
        `Found lingering "Deprecated per ADR-002" markers in:\n${lingeringMarkers.join('\n')}`,
      ).toEqual([]);
    });
  });
});
