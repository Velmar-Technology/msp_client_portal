#!/usr/bin/env node
import { SequenceSentinelService } from './services/SequenceSentinelService';
import { SequenceAuditWindow } from './types';

/**
 * Command-Line Interface runner for SequenceSentinel.
 * Usage:
 *   npm -w server run sentinel:audit -- [--hours=24] [--generate-tests] [--tenant=<uuid>]
 */
async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  let hours = 24;
  let generateTests = false;
  let autoHeal = false;
  let tenantId: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--hours=')) {
      hours = parseInt(arg.replace('--hours=', ''), 10) || 24;
    } else if (arg === '--generate-tests') {
      generateTests = true;
    } else if (arg === '--auto-heal') {
      autoHeal = true;
    } else if (arg.startsWith('--tenant=')) {
      tenantId = arg.replace('--tenant=', '').trim() || undefined;
    }
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const window: SequenceAuditWindow = {
    startDate,
    endDate: now,
    tenantId,
  };

  console.log(`\n======================================================`);
  console.log(` 🛡️  SequenceSentinel Business Logic Integrity Auditor`);
  console.log(`======================================================`);
  console.log(`Temporal Window: Last ${hours} hours`);
  console.log(`Range: ${startDate.toISOString()} -> ${now.toISOString()}`);
  if (tenantId) console.log(`Tenant Scoped: ${tenantId}`);
  console.log(`Synthesize Vitest Specs: ${generateTests ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Autonomous Self-Healing: ${autoHeal ? '🔥 ENABLED (Active Remediation)' : 'DISABLED (Advisory Only)'}`);
  console.log(`Evaluating 18 Master Business Logic Invariants (BL-101 to BL-802)...\n`);

  const sentinel = new SequenceSentinelService();

  try {
    const report = await sentinel.runAudit(window, {
      generateTests,
      autoHeal,
      saveReport: true,
    });

    console.log(sentinel.formatMarkdownReport(report));

    if (report.totalViolations > 0) {
      console.error(`\n❌ Audit completed with ${report.totalViolations} detected violation(s).`);
      process.exit(1);
    } else {
      console.log(`\n✅ Audit completed cleanly. All 18 business rules satisfied with zero drift.`);
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Sentinel execution error:', error);
    process.exit(2);
  }
}

runCli();
