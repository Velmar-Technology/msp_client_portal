import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CafQualityAgent } from '../caf/CafQualityAgent.js';
import { ByokLlmClient, ByokKeyMissingError, type ByokProvider } from '../byok/ByokLlmClient.js';
import { TenantByokManager } from '../byok/TenantByokManager.js';

export function registerCafTools(server: McpServer) {
  const tenantManager = TenantByokManager.getInstance();

  /**
   * Helper to resolve tenant-isolated privacy filter, BYOK LLM client, and agent.
   */
  async function resolveTenantAgent(
    tenantId?: string,
    overrides?: {
      apiKey?: string;
      provider?: ByokProvider;
      model?: string;
      baseUrl?: string;
    }
  ) {
    if (tenantId && !overrides?.apiKey) {
      await tenantManager.ensureTenantProfile(tenantId);
    }

    const resolvedConfig = tenantManager.resolveConfig(tenantId, overrides);
    const privacyFilter = tenantId
      ? tenantManager.getTenantPrivacyFilter(tenantId)
      : tenantManager.getTenantPrivacyFilter('default');

    const llmClient = new ByokLlmClient(resolvedConfig);
    const agent = new CafQualityAgent(llmClient, privacyFilter);

    return { agent, privacyFilter, resolvedConfig };
  }

  // 1. Tool: caf_configure_tenant_byok (Multi-tenant Credential Onboarding)
  server.tool(
    'caf_configure_tenant_byok',
    'Register or update private BYOK LLM credentials and preferences for an educational institution (tenant isolation)',
    {
      tenantId: z.string().min(1).describe('The unique UUID or identifier of the tenant/school'),
      institutionName: z.string().optional().describe('Display name of the educational center'),
      provider: z.enum(['openai', 'anthropic', 'custom']).describe('The external LLM provider funded by the school'),
      apiKey: z.string().min(8).describe('The school private API key (OpenAI sk-..., Anthropic sk-ant-...)'),
      model: z.string().optional().describe('Default model for this school (e.g., gpt-4o, claude-3-5-sonnet)'),
      baseUrl: z.string().url().optional().describe('Optional custom API base URL for private vLLM or local model deployments'),
    },
    async (params) => {
      tenantManager.setTenantProfile({
        tenantId: params.tenantId,
        institutionName: params.institutionName,
        provider: params.provider,
        apiKey: params.apiKey,
        model: params.model,
        baseUrl: params.baseUrl,
      });

      const status = tenantManager.getTenantStatus(params.tenantId);
      return {
        content: [
          {
            type: 'text',
            text: `[Tenant BYOK Configured]: School credentials successfully registered with isolated privacy partition.\n${JSON.stringify(status, null, 2)}`,
          },
        ],
      };
    }
  );

  // 2. Tool: caf_get_tenant_byok_status
  server.tool(
    'caf_get_tenant_byok_status',
    'Inspect tenant BYOK configuration, active LLM provider, and privacy partition status without exposing secret keys',
    {
      tenantId: z.string().min(1).describe('The UUID or identifier of the tenant/school'),
    },
    async ({ tenantId }) => {
      await tenantManager.ensureTenantProfile(tenantId);
      const status = tenantManager.getTenantStatus(tenantId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }
  );

  // 3. Tool: caf_audit_evidence
  server.tool(
    'caf_audit_evidence',
    'Audit institutional educational evidence against the 9 CAF criteria with tenant-isolated PII sanitization and BYOK LLM evaluation',
    {
      documentText: z.string().min(10).describe('The plain text content of the educational document, minutes, or manual to audit'),
      tenantId: z.string().optional().describe('Optional tenant UUID for multi-tenant isolation and credential routing'),
      institutionName: z.string().optional().describe('Name of the educational institution'),
      criteriaFilter: z.array(z.number().int().min(1).max(9)).optional().describe('Optional subset of CAF criteria IDs (1 to 9) to evaluate'),
      apiKey: z.string().optional().describe('Direct BYOK API key override'),
      provider: z.enum(['openai', 'anthropic', 'custom']).optional().describe('LLM provider override'),
      model: z.string().optional().describe('Model override (e.g. gpt-4o, claude-3-5-sonnet)'),
      preservePiiLocally: z.boolean().optional().describe('If true, restores masked names locally for authorized school staff'),
      dryRun: z.boolean().optional().describe('If true, executes deterministic rule-based evaluation without external LLM call'),
    },
    async (params) => {
      try {
        const { agent, resolvedConfig } = await resolveTenantAgent(params.tenantId, {
          apiKey: params.apiKey,
          provider: params.provider,
          model: params.model,
        });

        const report = await agent.auditEvidence({
          documentText: params.documentText,
          institutionName: params.institutionName,
          criteriaFilter: params.criteriaFilter,
          apiKey: resolvedConfig.apiKey,
          provider: resolvedConfig.provider,
          model: resolvedConfig.model,
          preservePiiLocally: params.preservePiiLocally,
          dryRun: params.dryRun,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      } catch (err: any) {
        const isKeyMissing = err instanceof ByokKeyMissingError || err.code === 'BYOK_KEY_MISSING';
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: isKeyMissing
                ? `[BYOK Authorization Required]: ${err.message}`
                : `Failed to execute CAF evidence audit: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  // 4. Tool: caf_analyze_survey_sentiment
  server.tool(
    'caf_analyze_survey_sentiment',
    'Analyze stakeholder satisfaction surveys with tenant-isolated PII redaction and compute quantitative impact for CAF Criteria 6 & 7',
    {
      surveys: z
        .array(
          z.object({
            respondentType: z.enum(['STUDENT', 'TEACHER', 'PARENT']).describe('Type of stakeholder respondent'),
            feedback: z.string().min(1).describe('Survey response or qualitative feedback text'),
            rating: z.number().min(1).max(5).optional().describe('Optional 1-5 numerical rating'),
          })
        )
        .min(1)
        .describe('List of stakeholder survey submissions to evaluate'),
      tenantId: z.string().optional().describe('Optional tenant UUID for multi-tenant credential resolution'),
      apiKey: z.string().optional().describe('Direct BYOK API key override'),
      provider: z.enum(['openai', 'anthropic', 'custom']).optional().describe('LLM provider override'),
      dryRun: z.boolean().optional().describe('If true, executes deterministic sentiment computation'),
    },
    async (params) => {
      try {
        const { agent, resolvedConfig } = await resolveTenantAgent(params.tenantId, {
          apiKey: params.apiKey,
          provider: params.provider,
        });

        const result = await agent.analyzeSurveySentiment({
          surveys: params.surveys,
          apiKey: resolvedConfig.apiKey,
          provider: resolvedConfig.provider,
          dryRun: params.dryRun,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to analyze surveys: ${err.message}` }],
        };
      }
    }
  );

  // 5. Tool: caf_detect_documentary_gaps
  server.tool(
    'caf_detect_documentary_gaps',
    'Identify documentary non-compliance, missing records, and evidence gaps against the 9 CAF criteria',
    {
      documentText: z.string().min(10).describe('The plain text of educational documents to analyze for missing records'),
      tenantId: z.string().optional().describe('Optional tenant UUID'),
      institutionName: z.string().optional().describe('Name of the educational institution'),
      apiKey: z.string().optional().describe('Direct BYOK API key override'),
      provider: z.enum(['openai', 'anthropic', 'custom']).optional().describe('LLM provider override'),
      dryRun: z.boolean().optional().describe('If true, executes rule-based gap analysis'),
    },
    async (params) => {
      try {
        const { agent, resolvedConfig } = await resolveTenantAgent(params.tenantId, {
          apiKey: params.apiKey,
          provider: params.provider,
        });

        const audit = await agent.auditEvidence({
          documentText: params.documentText,
          institutionName: params.institutionName,
          apiKey: resolvedConfig.apiKey,
          provider: resolvedConfig.provider,
          dryRun: params.dryRun,
        });

        const gapsSummary = {
          institutionName: audit.institutionName,
          compositeScore: audit.compositeScore,
          letterGrade: audit.letterGrade,
          totalGapsIdentified: audit.identifiedGaps.length,
          criticalDocumentaryGaps: audit.identifiedGaps,
          criteriaDeficiencies: audit.criteriaEvaluated
            .filter((c) => c.documentaryGaps.length > 0)
            .map((c) => ({
              criterionId: c.criterionId,
              criterionName: c.criterionName,
              score: c.score,
              maturityLevel: c.maturityLevel,
              missingRecords: c.documentaryGaps,
            })),
          swotMatrix: audit.swotMatrix,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(gapsSummary, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to detect documentary gaps: ${err.message}` }],
        };
      }
    }
  );

  // 6. Tool: caf_generate_improvement_plan
  server.tool(
    'caf_generate_improvement_plan',
    'Generate the formal Institutional Improvement Plan (PMI) with SMART actions, indicators, timelines, and roles based on CAF audit findings',
    {
      auditReport: z
        .any()
        .describe('Structured CafAuditReport object or JSON string containing composite scores and identified gaps'),
      tenantId: z.string().optional().describe('Optional tenant UUID'),
      targetYear: z.number().int().optional().describe('Target academic year for the improvement plan'),
      apiKey: z.string().optional().describe('Direct BYOK API key override'),
      provider: z.enum(['openai', 'anthropic', 'custom']).optional().describe('LLM provider override'),
      dryRun: z.boolean().optional().describe('If true, executes deterministic PMI generator without external API call'),
    },
    async (params) => {
      try {
        let auditReport = params.auditReport;
        if (typeof auditReport === 'string') {
          auditReport = JSON.parse(auditReport);
        }

        const { agent, resolvedConfig } = await resolveTenantAgent(params.tenantId, {
          apiKey: params.apiKey,
          provider: params.provider,
        });

        const plan = await agent.generateImprovementPlan({
          auditReport,
          targetYear: params.targetYear,
          apiKey: resolvedConfig.apiKey,
          provider: resolvedConfig.provider,
          dryRun: params.dryRun,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(plan, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to generate improvement plan: ${err.message}` }],
        };
      }
    }
  );

  // 7. Tool: caf_anonymize_text
  server.tool(
    'caf_anonymize_text',
    'Demonstrate and verify local in-memory PII sanitization under Dominican Law 172-13 with optional tenant partition',
    {
      text: z.string().describe('Raw text containing student, teacher, or institutional identifiers'),
      tenantId: z.string().optional().describe('Optional tenant UUID to use a tenant-isolated pseudonym partition'),
    },
    async ({ text, tenantId }) => {
      const filter = tenantId
        ? tenantManager.getTenantPrivacyFilter(tenantId)
        : tenantManager.getTenantPrivacyFilter('default');

      const result = filter.anonymize(text);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                tenantId: tenantId || 'default',
                originalLength: text.length,
                anonymizedLength: result.anonymizedText.length,
                redactionsCount: result.redactionsCount,
                detectedEntities: result.detectedEntities,
                anonymizedPreview: result.anonymizedText,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
