import { execSync } from 'child_process';

const PROTECTED_PATTERNS = [
  /^\.env(\..+)?$/,
  /^\.github\/workflows\//,
  /^\.husky\//,
  /^server\/src\/shared\/db\/migrations\//
];

try {
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  // Allow override only if explicitly requested with ALLOW_PROTECTED_CHANGES=1
  if (process.env.ALLOW_PROTECTED_CHANGES === '1') {
    console.warn('⚠️ [AGENTS.md Gatekeeper] Protected path check bypassed via ALLOW_PROTECTED_CHANGES=1');
    process.exit(0);
  }

  const violations = stagedFiles.filter(file =>
    PROTECTED_PATTERNS.some(pattern => pattern.test(file))
  );

  if (violations.length > 0) {
    console.error('\n❌ [AGENTS.md Gatekeeper] COMMIT BLOCKED: Attempting to modify protected path(s):');
    violations.forEach(v => console.error(`   - ${v}`));
    console.error('\nProtected files in AGENTS.md Section 9:');
    console.error(' - .env, .env.*');
    console.error(' - .github/workflows/');
    console.error(' - .husky/');
    console.error(' - server/src/shared/db/migrations/');
    console.error('\nIf this is an intentional administrative change, run with ALLOW_PROTECTED_CHANGES=1\n');
    process.exit(1);
  }

  console.log('✅ [AGENTS.md Gatekeeper] Protected paths check passed.');
  process.exit(0);
} catch (error) {
  if (error.status === 1) {
    process.exit(1);
  }
  // If not a git repository or git error, log warning and exit cleanly
  console.warn('⚠️ [AGENTS.md Gatekeeper] Unable to inspect staged git diff:', error.message);
  process.exit(0);
}
