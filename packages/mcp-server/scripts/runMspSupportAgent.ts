import dotenv from 'dotenv';
import { MspApiClient } from '../src/client/MspApiClient.js';
import { MspSupportAgent } from '../src/agent/MspSupportAgent.js';

dotenv.config();

const apiUrl =
  process.env.MSP_API_URL ||
  (process.env.MSP_SERVER_URL
    ? `${process.env.MSP_SERVER_URL.replace(/\/+$/, '')}/api/v1`
    : 'https://helpdesk.velmartech.com.do/api/v1');

const apiToken = (process.env.MSP_API_KEY || process.env.MSP_API_TOKEN || '').trim();
const tenantId = process.env.MSP_TENANT_ID;

const client = new MspApiClient({
  apiUrl,
  apiToken,
  tenantId,
});

const agent = new MspSupportAgent(client);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  const targetId = args[1];

  console.log('===============================================================');
  console.log('🚀 Autonomous MSP Support & Operations Agent (Tier-1 / Tier-2)');
  console.log(`Endpoint: ${apiUrl}`);
  console.log('===============================================================\n');

  if (!command || !targetId) {
    console.log('Usage:');
    console.log('  npx tsx scripts/runMspSupportAgent.ts triage <ticketId>');
    console.log('  npx tsx scripts/runMspSupportAgent.ts qbr <tenantId> [companyName]\n');
    process.exit(0);
  }

  try {
    if (command === 'triage') {
      console.log(`[AGENT] Triaging ticket #${targetId}...`);
      const report = await agent.triageTicket(targetId);

      console.log('\n--- TRIAGE SUMMARY ---');
      console.log(`Title: ${report.ticket.title}`);
      console.log(`Category: ${report.ticket.category} | Priority: ${report.ticket.priority}`);
      console.log(`Root Cause Hypothesis: ${report.rootCauseHypothesis}`);
      console.log(`SLA Window: ${report.slaStatus.withinCancellationWindow ? 'Valid' : 'Expired'}`);
      if (report.slaStatus.recommendedEscalation) {
        console.log('⚠️ Escalation Recommended: Ticket exceeded unworked time threshold (BL-104)');
      }

      console.log('\n' + report.internalTechnicianNote);
      console.log('\n' + report.clientFacingUpdate);
    } else if (command === 'qbr') {
      const companyName = args[2] || 'Client Organization';
      console.log(`[AGENT] Generating QBR Executive Report for ${companyName} (${targetId})...`);
      const qbr = await agent.generateQbrReport(targetId, companyName);

      console.log('\n--- QBR EXECUTIVE BRIEF ---');
      console.log(`Overall Health Score: ${qbr.compositeHealth.overallScore}% (Grade: ${qbr.letterGrade})`);
      console.log(`Devices: ${qbr.deviceStats.total} total (${qbr.deviceStats.online} online, ${qbr.deviceStats.offline} offline)`);
      console.log(`Tickets: ${qbr.ticketStats.total} total (${qbr.ticketStats.open} open, ${qbr.ticketStats.criticalOrHigh} high/crit)`);

      console.log('\nTop Operational Risks:');
      qbr.topOperationalRisks.forEach((r) => console.log(` - ${r}`));

      console.log('\nRecommended Strategic Roadmap:');
      qbr.strategicRoadmap.forEach((s) => console.log(` - ${s}`));
    } else {
      console.error(`Unknown command: "${command}". Available commands: triage, qbr.`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ [Agent Execution Error]: ${error.message}`);
    process.exit(1);
  }
}

main();
