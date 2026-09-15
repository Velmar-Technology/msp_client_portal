import { describe, it, expect, vi } from 'vitest';
import { CafPrivacyFilter } from './CafPrivacyFilter.js';
import { CafQualityAgent, CAF_CRITERIA } from './CafQualityAgent.js';
import { ByokLlmClient, ByokKeyMissingError } from '../byok/ByokLlmClient.js';
import { TenantByokManager } from '../byok/TenantByokManager.js';
import { createMspMcpServer } from '../serverFactory.js';

describe('CafPrivacyFilter (Dominican Law 172-13 Data Protection)', () => {
  const filter = new CafPrivacyFilter();

  it('redacts student and faculty sensitive identifiers while maintaining sentence structure', () => {
    const rawDocument = `
      El Estudiante Juan Pérez con matrícula 2024-0891 y cédula 001-1982736-4
      ha solicitado revisión de calificaciones. Su correo es juan.perez@colegio.edu.do
      y su teléfono de contacto es 809-555-4321. La reunión fue supervisada por el
      Profesor Carlos Alcántara.
    `;

    const result = filter.anonymize(rawDocument);

    expect(result.redactionsCount).toBeGreaterThanOrEqual(5);
    expect(result.detectedEntities.emails).toBe(1);
    expect(result.detectedEntities.telefonos).toBe(1);
    expect(result.detectedEntities.cedulas).toBe(1);
    expect(result.detectedEntities.matriculas).toBe(1);

    // Verify plaintext is stripped
    expect(result.anonymizedText).not.toContain('juan.perez@colegio.edu.do');
    expect(result.anonymizedText).not.toContain('809-555-4321');
    expect(result.anonymizedText).not.toContain('001-1982736-4');
    expect(result.anonymizedText).not.toContain('2024-0891');

    // Verify presence of privacy tokens
    expect(result.anonymizedText).toContain('[EMAIL_01]');
    expect(result.anonymizedText).toContain('[TELEFONO_01]');
    expect(result.anonymizedText).toContain('[CEDULA_01]');
    expect(result.anonymizedText).toContain('[MATRICULA_01]');
  });

  it('allows authorized local restoration of anonymized tokens via deanonymize', () => {
    const sample = 'El alumno con [EMAIL_01] y cédula [CEDULA_01] fue aprobado.';
    const mapping = {
      '[EMAIL_01]': 'estudiante@liceo.do',
      '[CEDULA_01]': '001-0000000-1',
    };

    const restored = filter.deanonymize(sample, mapping);

    expect(restored).toBe('El alumno con estudiante@liceo.do y cédula 001-0000000-1 fue aprobado.');
  });
});

describe('ByokLlmClient (Zero-Liability Token Architecture)', () => {
  it('throws ByokKeyMissingError when no API key is supplied or configured in environment', async () => {
    // Ensure clean test environment without keys
    const originalEnv = process.env.BYOK_DEFAULT_API_KEY;
    const originalOpenAi = process.env.OPENAI_API_KEY;
    delete process.env.BYOK_DEFAULT_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const client = new ByokLlmClient();

    await expect(
      client.generate({
        prompt: 'Prueba de auditoría',
        provider: 'openai',
      })
    ).rejects.toThrow(ByokKeyMissingError);

    // Restore environment
    if (originalEnv) process.env.BYOK_DEFAULT_API_KEY = originalEnv;
    if (originalOpenAi) process.env.OPENAI_API_KEY = originalOpenAi;
  });
});

describe('CafQualityAgent (CAF Educational Quality Engine)', () => {
  const privacyFilter = new CafPrivacyFilter();

  it('audits institutional evidence across all 9 CAF criteria deterministically in dry-run mode', async () => {
    const agent = new CafQualityAgent(new ByokLlmClient(), privacyFilter);

    const sampleEvidence = `
      PLAN OPERATIVO ANUAL (POA) - COLEGIO SANTA MARÍA 2026
      Misión y Visión: Formar líderes con excelencia académica y ética ciudadana.
      Procesos: Se aplican rúbricas de evaluación diagnóstica en todas las asignaturas.
      Docentes: Jornada de capacitación en metodologías activas completada en enero.
      Tecnología: Disponibilidad de laboratorio de robótica e internet fibra óptica.
      Contacto de Secretaría: soporte@colegio.edu.do, teléfono 809-567-0000.
    `;

    const report = await agent.auditEvidence({
      documentText: sampleEvidence,
      institutionName: 'Colegio Santa María',
      dryRun: true,
    });

    expect(report.institutionName).toBe('Colegio Santa María');
    expect(report.criteriaEvaluated).toHaveLength(9);
    expect(report.compositeScore).toBeGreaterThanOrEqual(50);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.letterGrade);
    expect(report.identifiedGaps.length).toBeGreaterThan(0);
    expect(report.swotMatrix.strengths.length).toBeGreaterThan(0);
    expect(report.swotMatrix.weaknesses.length).toBeGreaterThan(0);

    // Verify privacy telemetry tracked redactions
    expect(report.privacyTelemetry.emails).toBe(1);
    expect(report.privacyTelemetry.telefonos).toBe(1);
  });

  it('filters specific criteria when criteriaFilter is provided', async () => {
    const agent = new CafQualityAgent(new ByokLlmClient(), privacyFilter);

    const report = await agent.auditEvidence({
      documentText: 'Documento breve de liderazgo institucional y planificación estratégica.',
      criteriaFilter: [1, 2], // Only Liderazgo and Estrategia
      dryRun: true,
    });

    expect(report.criteriaEvaluated).toHaveLength(2);
    expect(report.criteriaEvaluated.map((c) => c.criterionId)).toEqual([1, 2]);
  });

  it('analyzes stakeholder surveys and computes Criteria 6 & 7 impact', async () => {
    const agent = new CafQualityAgent(new ByokLlmClient(), privacyFilter);

    const sampleSurveys = [
      {
        respondentType: 'STUDENT' as const,
        feedback: 'Excelente apoyo de los profesores en el laboratorio de robótica.',
        rating: 5,
      },
      {
        respondentType: 'TEACHER' as const,
        feedback: 'Buen ambiente de trabajo, pero hace falta más tiempo para planificación de aula.',
        rating: 4,
      },
      {
        respondentType: 'PARENT' as const,
        feedback: 'Muy satisfecho con la comunicación del colegio y la plataforma digital.',
        rating: 5,
      },
      {
        respondentType: 'STUDENT' as const,
        feedback: 'La conexión WiFi en el aula es lenta a veces.',
        rating: 2,
      },
    ];

    const result = await agent.analyzeSurveySentiment({
      surveys: sampleSurveys,
      dryRun: true,
    });

    expect(result.totalSurveys).toBe(4);
    expect(result.distribution.students).toBe(2);
    expect(result.distribution.teachers).toBe(1);
    expect(result.distribution.parents).toBe(1);
    expect(result.overallSatisfactionPercentage).toBeGreaterThanOrEqual(50);
    expect(result.cafCriterionImpact.criterion6Score).toBeGreaterThan(0);
    expect(result.cafCriterionImpact.criterion7Score).toBeGreaterThan(0);
  });

  it('generates a structured Institutional Improvement Plan (PMI)', async () => {
    const agent = new CafQualityAgent(new ByokLlmClient(), privacyFilter);

    const mockAuditReport: any = {
      institutionName: 'Instituto Politécnico San Valente',
      compositeScore: 68,
      letterGrade: 'C',
      identifiedGaps: [
        'Falta formalizar el manual de inducción docente.',
        'Inexistencia de encuestas semestrales de clima institucional.',
        'Ausencia de plan de mantenimiento preventivo de switches y redes.',
      ],
    };

    const plan = await agent.generateImprovementPlan({
      auditReport: mockAuditReport,
      targetYear: 2026,
      dryRun: true,
    });

    expect(plan.institutionName).toBe('Instituto Politécnico San Valente');
    expect(plan.planVersion).toBe('PMI-2026.1');
    expect(plan.baselineCompositeScore).toBe(68);
    expect(plan.targetCompositeScore).toBe(83); // Baseline + 15
    expect(plan.actions.length).toBe(3);
    expect(plan.actions[0].id).toBe('PMI-2026-001');
    expect(plan.actions[0].smartObjective).toBeDefined();
    expect(plan.actions[0].kpiIndicator).toBeDefined();
    expect(plan.actions[0].responsibleRole).toBeDefined();
  });

  it('executes end-to-end with a mocked BYOK LLM client', async () => {
    const mockLlmClient = {
      generate: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          compositeScore: 84,
          criteriaEvaluated: [
            {
              criterionId: 1,
              criterionName: 'Liderazgo',
              block: 'AGENTES',
              score: 85,
              maturityLevel: 'GESTIONADO',
              strengths: ['Equipo directivo altamente cohesionado.'],
              documentaryGaps: ['Falta actualizar el código de ética.'],
              evidenceCitations: ['Acta del Consejo Directivo No. 12.'],
            },
          ],
          swotMatrix: {
            strengths: ['Liderazgo directivo'],
            weaknesses: ['Código de ética no formalizado'],
            opportunities: ['Certificación internacional CAF'],
            threats: ['Rotación de personal clave'],
          },
        }),
        provider: 'openai',
        model: 'gpt-4o',
        usage: {
          promptTokens: 1200,
          completionTokens: 350,
          totalTokens: 1550,
        },
      }),
    };

    const agent = new CafQualityAgent(mockLlmClient as any, privacyFilter);

    const report = await agent.auditEvidence({
      documentText: 'Acta del Consejo Directivo No. 12 del Colegio Modelo.',
      institutionName: 'Colegio Modelo',
      apiKey: 'sk-test-byok-key-12345',
      criteriaFilter: [1],
    });

    expect(mockLlmClient.generate).toHaveBeenCalledTimes(1);
    expect(report.compositeScore).toBe(84);
    expect(report.letterGrade).toBe('B');
    expect(report.criteriaEvaluated[0].maturityLevel).toBe('GESTIONADO');
    expect(report.byokTokenUsage?.totalTokens).toBe(1550);
  });
});

describe('TenantByokManager (Multi-Tenant BYOK & Privacy Isolation)', () => {
  const manager = TenantByokManager.getInstance();

  it('manages distinct BYOK credentials across multiple tenants', () => {
    const tenantA = 'tenant-school-a-uuid';
    const tenantB = 'tenant-school-b-uuid';

    manager.setTenantProfile({
      tenantId: tenantA,
      institutionName: 'Colegio Alpha',
      provider: 'openai',
      apiKey: 'sk-school-a-super-secret-key-12345',
      model: 'gpt-4o',
    });

    manager.setTenantProfile({
      tenantId: tenantB,
      institutionName: 'Liceo Beta',
      provider: 'anthropic',
      apiKey: 'sk-ant-school-b-super-secret-key-67890',
      model: 'claude-3-5-sonnet-20241022',
    });

    expect(manager.hasTenantProfile(tenantA)).toBe(true);
    expect(manager.hasTenantProfile(tenantB)).toBe(true);

    const configA = manager.resolveConfig(tenantA);
    const configB = manager.resolveConfig(tenantB);

    expect(configA.provider).toBe('openai');
    expect(configA.apiKey).toBe('sk-school-a-super-secret-key-12345');
    expect(configA.model).toBe('gpt-4o');

    expect(configB.provider).toBe('anthropic');
    expect(configB.apiKey).toBe('sk-ant-school-b-super-secret-key-67890');
    expect(configB.model).toBe('claude-3-5-sonnet-20241022');

    // Status inspection does not expose plaintext keys
    const statusA = manager.getTenantStatus(tenantA);
    expect(statusA.isConfigured).toBe(true);
    expect(statusA.keyMasked).toContain('...');
    expect(statusA.keyMasked).not.toBe('sk-school-a-super-secret-key-12345');
  });

  it('maintains completely isolated privacy partitions per tenant (Ley 172-13)', () => {
    const tenant1 = 'school-1';
    const tenant2 = 'school-2';

    const filter1 = manager.getTenantPrivacyFilter(tenant1);
    const filter2 = manager.getTenantPrivacyFilter(tenant2);

    expect(filter1).not.toBe(filter2);

    const text1 = 'Estudiante Mario Gómez cédula 001-1111111-1';
    const text2 = 'Estudiante Mario Gómez cédula 001-2222222-2';

    const res1 = filter1.anonymize(text1);
    const res2 = filter2.anonymize(text2);

    expect(res1.mapping['[CEDULA_01]']).toBe('001-1111111-1');
    expect(res2.mapping['[CEDULA_01]']).toBe('001-2222222-2');
  });
});

describe('McpServerProfile Tool Isolation', () => {
  it('instantiates caf-education profile cleanly without requiring apiClient', () => {
    const server = createMspMcpServer(undefined, 'caf-education');
    expect(server).toBeDefined();
  });

  it('instantiates msp-support profile with administrative tools', () => {
    const mockApiClient: any = {};
    const server = createMspMcpServer(mockApiClient, 'msp-support');
    expect(server).toBeDefined();
  });

  it('instantiates unified all profile', () => {
    const mockApiClient: any = {};
    const server = createMspMcpServer(mockApiClient, 'all');
    expect(server).toBeDefined();
  });
});

