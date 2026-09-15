import { ByokLlmClient, type ByokProvider } from '../byok/ByokLlmClient.js';
import { CafPrivacyFilter, type AnonymizationResult } from './CafPrivacyFilter.js';

/**
 * The 9 Standard CAF (Common Assessment Framework / Marco Común de Evaluación) Criteria.
 */
export const CAF_CRITERIA = [
  { id: 1, name: 'Liderazgo', block: 'AGENTES', description: 'Dirección estratégica, ética, y gobernanza institucional del centro educativo.' },
  { id: 2, name: 'Estrategia y Planificación', block: 'AGENTES', description: 'Plan Estratégico Institucional (PEI), POA, y alineación curricular.' },
  { id: 3, name: 'Personas', block: 'AGENTES', description: 'Gestión del talento docente, capacitación continua, y bienestar laboral.' },
  { id: 4, name: 'Alianzas y Recursos', block: 'AGENTES', description: 'Infraestructura tecnológica, laboratorios, alianzas comunitarias y presupuesto.' },
  { id: 5, name: 'Procesos', block: 'AGENTES', description: 'Diseño pedagógico, gestión académica, admisiones y mejora continua.' },
  { id: 6, name: 'Resultados en los Alumnos y Familias', block: 'RESULTADOS', description: 'Satisfacción estudiantil, clima escolar, y percepción de padres/tutores.' },
  { id: 7, name: 'Resultados en el Personal', block: 'RESULTADOS', description: 'Satisfacción docente, retención del personal y clima laboral.' },
  { id: 8, name: 'Resultados en la Sociedad', block: 'RESULTADOS', description: 'Impacto comunitario, proyectos de servicio social y sostenibilidad.' },
  { id: 9, name: 'Resultados Clave del Rendimiento', block: 'RESULTADOS', description: 'Tasas de promoción, pruebas nacionales, deserción y eficiencia operativa.' },
] as const;

export type CafCriterionId = (typeof CAF_CRITERIA)[number]['id'];

/**
 * Criterion audit score detail.
 */
export interface CafCriterionScore {
  criterionId: number;
  criterionName: string;
  block: 'AGENTES' | 'RESULTADOS';
  score: number; // 0 - 100
  maturityLevel: 'INICIAL' | 'EN_DESARROLLO' | 'DEFINIDO' | 'GESTIONADO' | 'OPTIMIZADO';
  strengths: string[];
  documentaryGaps: string[];
  evidenceCitations: string[];
}

/**
 * Comprehensive result of an evidence audit across CAF criteria.
 */
export interface CafAuditReport {
  institutionName: string;
  auditDate: string;
  compositeScore: number;
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  criteriaEvaluated: CafCriterionScore[];
  identifiedGaps: string[];
  swotMatrix: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  privacyTelemetry: AnonymizationResult['detectedEntities'];
  byokTokenUsage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Stakeholder survey sentiment & feedback analysis item.
 */
export interface SurveySentimentItem {
  respondentType: 'STUDENT' | 'TEACHER' | 'PARENT';
  sentiment: 'POSITIVO' | 'NEUTRO' | 'NEGATIVO';
  keyThemes: string[];
  satisfactionScore: number; // 1 - 5
  quoteSnippet: string;
}

/**
 * Consolidated survey analysis for CAF Criteria 6 & 7.
 */
export interface CafSurveyAnalysisReport {
  totalSurveys: number;
  distribution: {
    students: number;
    teachers: number;
    parents: number;
  };
  overallSatisfactionPercentage: number;
  sentimentSummary: {
    positivePercentage: number;
    neutralPercentage: number;
    negativePercentage: number;
  };
  topStrengths: string[];
  urgentComplaints: string[];
  cafCriterionImpact: {
    criterion6Score: number; // Alumnos y Familias (0-100)
    criterion7Score: number; // Personal Docente (0-100)
  };
}

/**
 * Institutional Improvement Plan (Plan de Mejora Institucional - PMI) action item.
 */
export interface PmiActionItem {
  id: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  criterionId: number;
  title: string;
  smartObjective: string;
  specificActions: string[];
  kpiIndicator: string;
  targetTimeline: string; // e.g. "Mes 1-3"
  responsibleRole: string;
}

/**
 * Complete Institutional Improvement Plan.
 */
export interface CafImprovementPlan {
  institutionName: string;
  planVersion: string;
  createdAt: string;
  baselineCompositeScore: number;
  targetCompositeScore: number;
  actions: PmiActionItem[];
  executiveSummary: string;
}

/**
 * Autonomous CAF Educational Quality & Audit Agent.
 *
 * Specializes in automating the Common Assessment Framework (Marco Común de Evaluación)
 * for private and public educational institutions. Operates on a Bring Your Own Key (BYOK)
 * architecture, protecting student privacy via local PII sanitization (Dominican Law 172-13).
 */
export class CafQualityAgent {
  private readonly privacyFilter: CafPrivacyFilter;

  constructor(
    private readonly llmClient: ByokLlmClient = new ByokLlmClient(),
    privacyFilter?: CafPrivacyFilter
  ) {
    this.privacyFilter = privacyFilter || new CafPrivacyFilter();
  }

  /**
   * Evaluates institutional documentary evidence against the 9 CAF criteria.
   *
   * @param params - Document text, optional criteria subset, and BYOK overrides
   * @returns Structured CAF Audit Report with criteria scores, SWOT, and citations
   */
  async auditEvidence(params: {
    documentText: string;
    institutionName?: string;
    criteriaFilter?: number[];
    apiKey?: string;
    provider?: ByokProvider;
    model?: string;
    preservePiiLocally?: boolean;
    dryRun?: boolean;
  }): Promise<CafAuditReport> {
    const institution = params.institutionName || 'Centro Educativo';

    // 1. Sanitize sensitive student / faculty PII locally (Ley 172-13)
    const anonymized = this.privacyFilter.anonymize(params.documentText);

    // 2. Determine targeted criteria
    const targetedCriteria = CAF_CRITERIA.filter(
      (c) => !params.criteriaFilter || params.criteriaFilter.includes(c.id)
    );

    // 3. Fallback deterministic execution for dry-run/mock testing
    if (params.dryRun) {
      return this.synthesizeDeterministicAudit(
        institution,
        targetedCriteria,
        anonymized,
        params.preservePiiLocally
      );
    }

    // 4. Construct System & User prompts for BYOK LLM
    const systemPrompt = [
      'Eres el Agente Auditor Senior especializado en el Marco Común de Evaluación (CAF) para Centros Educativos.',
      'Tu misión es evaluar evidencias documentales (PEI, POA, actas de reuniones, reglamentos, informes académicos) según los 9 Criterios del modelo CAF.',
      'Analiza objetivamente la presencia o ausencia de evidencias verificables.',
      'IMPORTANTE: Responde ÚNICAMENTE con un bloque JSON estructurado válido según el esquema solicitado.',
    ].join('\n');

    const criteriaListText = targetedCriteria
      .map((c) => `- Criterio ${c.id}: ${c.name} (${c.block}) - ${c.description}`)
      .join('\n');

    const userPrompt = [
      `Centro Educativo: ${institution}`,
      `Criterios a evaluar:\n${criteriaListText}`,
      ``,
      `--- INICIO DE EVIDENCIA DOCUMENTAL (ANONIMIZADA BAJO LEY 172-13) ---`,
      anonymized.anonymizedText,
      `--- FIN DE EVIDENCIA DOCUMENTAL ---`,
      ``,
      `Genera una evaluación rigurosa en formato JSON exacto con las siguientes propiedades:`,
      `{`,
      `  "compositeScore": number (0 a 100),`,
      `  "criteriaEvaluated": [`,
      `    {`,
      `      "criterionId": number,`,
      `      "criterionName": string,`,
      `      "block": "AGENTES" | "RESULTADOS",`,
      `      "score": number (0 a 100),`,
      `      "maturityLevel": "INICIAL" | "EN_DESARROLLO" | "DEFINIDO" | "GESTIONADO" | "OPTIMIZADO",`,
      `      "strengths": string[],`,
      `      "documentaryGaps": string[],`,
      `      "evidenceCitations": string[]`,
      `    }`,
      `  ],`,
      `  "swotMatrix": {`,
      `    "strengths": string[],`,
      `    "weaknesses": string[],`,
      `    "opportunities": string[],`,
      `    "threats": string[]`,
      `  }`,
      `}`,
    ].join('\n');

    // 5. Invoke LLM under BYOK
    const response = await this.llmClient.generate({
      prompt: userPrompt,
      systemPrompt,
      apiKey: params.apiKey,
      provider: params.provider,
      model: params.model,
      temperature: 0.1,
    });

    // 6. Parse JSON output
    let parsed: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
    } catch {
      // Fallback if LLM output was not strict JSON
      return this.synthesizeDeterministicAudit(
        institution,
        targetedCriteria,
        anonymized,
        params.preservePiiLocally,
        response.usage
      );
    }

    const compositeScore = Math.max(0, Math.min(100, Number(parsed.compositeScore) || 70));
    let letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (compositeScore >= 90) letterGrade = 'A';
    else if (compositeScore >= 80) letterGrade = 'B';
    else if (compositeScore >= 70) letterGrade = 'C';
    else if (compositeScore >= 60) letterGrade = 'D';
    else letterGrade = 'F';

    // Collect all identified gaps
    const allGaps: string[] = [];
    (parsed.criteriaEvaluated || []).forEach((c: any) => {
      if (Array.isArray(c.documentaryGaps)) {
        allGaps.push(...c.documentaryGaps);
      }
    });

    let reportText = JSON.stringify(parsed);
    if (params.preservePiiLocally) {
      reportText = this.privacyFilter.deanonymize(reportText, anonymized.mapping);
      parsed = JSON.parse(reportText);
    }

    return {
      institutionName: institution,
      auditDate: new Date().toISOString().split('T')[0],
      compositeScore,
      letterGrade,
      criteriaEvaluated: parsed.criteriaEvaluated || [],
      identifiedGaps: allGaps,
      swotMatrix: parsed.swotMatrix || {
        strengths: [],
        weaknesses: allGaps,
        opportunities: ['Digitalizar repositorio de evidencias con Velmar Cloud.'],
        threats: ['Incumplimiento de requisitos documentales en auditoría MINERD/ISO.'],
      },
      privacyTelemetry: anonymized.detectedEntities,
      byokTokenUsage: response.usage,
    };
  }

  /**
   * Analyzes stakeholder surveys (students, teachers, parents) and converts qualitative
   * feedback into quantitative sentiment scores for Criteria 6 & 7.
   */
  async analyzeSurveySentiment(params: {
    surveys: Array<{
      respondentType: 'STUDENT' | 'TEACHER' | 'PARENT';
      feedback: string;
      rating?: number;
    }>;
    apiKey?: string;
    provider?: ByokProvider;
    dryRun?: boolean;
  }): Promise<CafSurveyAnalysisReport> {
    const total = params.surveys.length;
    if (total === 0) {
      return {
        totalSurveys: 0,
        distribution: { students: 0, teachers: 0, parents: 0 },
        overallSatisfactionPercentage: 100,
        sentimentSummary: { positivePercentage: 100, neutralPercentage: 0, negativePercentage: 0 },
        topStrengths: [],
        urgentComplaints: [],
        cafCriterionImpact: { criterion6Score: 100, criterion7Score: 100 },
      };
    }

    const students = params.surveys.filter((s) => s.respondentType === 'STUDENT').length;
    const teachers = params.surveys.filter((s) => s.respondentType === 'TEACHER').length;
    const parents = params.surveys.filter((s) => s.respondentType === 'PARENT').length;

    // Sanitize feedback bundle
    const combinedFeedback = params.surveys
      .map((s, i) => `[Encuesta ${i + 1} | ${s.respondentType} | Rating: ${s.rating ?? 'N/A'}]: ${s.feedback}`)
      .join('\n');
    const sanitized = this.privacyFilter.anonymize(combinedFeedback);

    if (params.dryRun) {
      // Deterministic calculation
      let positiveCount = 0;
      let negativeCount = 0;
      params.surveys.forEach((s) => {
        const lower = s.feedback.toLowerCase();
        if (lower.includes('excelente') || lower.includes('buen') || lower.includes('apoyo') || (s.rating && s.rating >= 4)) {
          positiveCount++;
        } else if (lower.includes('falta') || lower.includes('lento') || lower.includes('problema') || lower.includes('queja') || (s.rating && s.rating <= 2)) {
          negativeCount++;
        }
      });
      const neutralCount = Math.max(0, total - (positiveCount + negativeCount));
      const posPct = Math.round((positiveCount / total) * 100);
      const neuPct = Math.round((neutralCount / total) * 100);
      const negPct = Math.max(0, 100 - (posPct + neuPct));

      return {
        totalSurveys: total,
        distribution: { students, teachers, parents },
        overallSatisfactionPercentage: posPct,
        sentimentSummary: {
          positivePercentage: posPct,
          neutralPercentage: neuPct,
          negativePercentage: negPct,
        },
        topStrengths: ['Compromiso docente', 'Ambiente escolar seguro'],
        urgentComplaints: negativeCount > 0 ? ['Tiempo de respuesta en plataforma digital'] : [],
        cafCriterionImpact: {
          criterion6Score: Math.round(posPct * 0.9 + 10),
          criterion7Score: Math.round(posPct * 0.85 + 15),
        },
      };
    }

    const systemPrompt =
      'Eres un analista psicométrico de encuestas educativas para el modelo de calidad CAF. ' +
      'Extrae métricas cuantitativas de satisfacción y clasifica quejas en JSON estricto.';

    const userPrompt = [
      `Analiza las siguientes ${total} encuestas de satisfacción escolar anonimizadas:`,
      sanitized.anonymizedText,
      ``,
      `Genera JSON:`,
      `{`,
      `  "overallSatisfactionPercentage": number,`,
      `  "positivePercentage": number,`,
      `  "neutralPercentage": number,`,
      `  "negativePercentage": number,`,
      `  "topStrengths": string[],`,
      `  "urgentComplaints": string[],`,
      `  "criterion6Score": number (0 a 100),`,
      `  "criterion7Score": number (0 a 100)`,
      `}`,
    ].join('\n');

    const response = await this.llmClient.generate({
      prompt: userPrompt,
      systemPrompt,
      apiKey: params.apiKey,
      provider: params.provider,
      temperature: 0.1,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
      return {
        totalSurveys: total,
        distribution: { students, teachers, parents },
        overallSatisfactionPercentage: Number(parsed.overallSatisfactionPercentage) || 75,
        sentimentSummary: {
          positivePercentage: Number(parsed.positivePercentage) || 70,
          neutralPercentage: Number(parsed.neutralPercentage) || 20,
          negativePercentage: Number(parsed.negativePercentage) || 10,
        },
        topStrengths: parsed.topStrengths || [],
        urgentComplaints: parsed.urgentComplaints || [],
        cafCriterionImpact: {
          criterion6Score: Number(parsed.criterion6Score) || 75,
          criterion7Score: Number(parsed.criterion7Score) || 70,
        },
      };
    } catch {
      return this.analyzeSurveySentiment({ ...params, dryRun: true });
    }
  }

  /**
   * Generates a formal Institutional Improvement Plan (Plan de Mejora Institucional - PMI)
   * based on the detected documentary gaps and SWOT matrix.
   */
  async generateImprovementPlan(params: {
    auditReport: CafAuditReport;
    targetYear?: number;
    apiKey?: string;
    provider?: ByokProvider;
    dryRun?: boolean;
  }): Promise<CafImprovementPlan> {
    const year = params.targetYear || new Date().getFullYear();
    const institution = params.auditReport.institutionName;
    const baselineScore = params.auditReport.compositeScore;
    const targetScore = Math.min(100, baselineScore + 15);

    if (params.dryRun) {
      const actions: PmiActionItem[] = params.auditReport.identifiedGaps.slice(0, 5).map((gap, i) => ({
        id: `PMI-${year}-${String(i + 1).padStart(3, '0')}`,
        priority: i === 0 ? 'ALTA' : i < 3 ? 'MEDIA' : 'BAJA',
        criterionId: (i % 5) + 1,
        title: `Remediación: ${gap.substring(0, 45)}...`,
        smartObjective: `Completar y homologar la documentación de ${gap} antes del cierre del ciclo académico.`,
        specificActions: [
          `Convocar al Comité de Calidad para redactar el protocolo correspondiente.`,
          `Subir el documento de evidencia formalizado a Velmar Cloud en formato PDF indexado.`,
        ],
        kpiIndicator: `100% de evidencia aprobada por la Dirección Académica.`,
        targetTimeline: i === 0 ? 'Mes 1-2' : 'Mes 3-5',
        responsibleRole: i % 2 === 0 ? 'Coordinación de Calidad' : 'Dirección Académica',
      }));

      return {
        institutionName: institution,
        planVersion: `PMI-${year}.1`,
        createdAt: new Date().toISOString().split('T')[0],
        baselineCompositeScore: baselineScore,
        targetCompositeScore: targetScore,
        actions,
        executiveSummary: `Plan de Mejora Institucional ${year} orientado a cerrar ${params.auditReport.identifiedGaps.length} brechas documentales y elevar la madurez CAF de ${baselineScore}% a ${targetScore}%.`,
      };
    }

    const systemPrompt =
      'Eres el Director Estratégico de Calidad Educativa. ' +
      'Diseña un Plan de Mejora Institucional (PMI) riguroso, SMART y priorizado según las brechas detectadas del modelo CAF en formato JSON estricto.';

    const userPrompt = [
      `Institución: ${institution}`,
      `Puntaje CAF Actual: ${baselineScore}% (Grado ${params.auditReport.letterGrade})`,
      `Brechas documentales detectadas:\n${params.auditReport.identifiedGaps.map((g) => `- ${g}`).join('\n')}`,
      ``,
      `Genera un JSON con un array "actions" donde cada acción tenga:`,
      `{`,
      `  "id": string (ej. "PMI-${year}-001"),`,
      `  "priority": "ALTA" | "MEDIA" | "BAJA",`,
      `  "criterionId": number (1 a 9),`,
      `  "title": string,`,
      `  "smartObjective": string,`,
      `  "specificActions": string[],`,
      `  "kpiIndicator": string,`,
      `  "targetTimeline": string,`,
      `  "responsibleRole": string`,
      `}`,
      `y una propiedad "executiveSummary" en texto.`,
    ].join('\n');

    const response = await this.llmClient.generate({
      prompt: userPrompt,
      systemPrompt,
      apiKey: params.apiKey,
      provider: params.provider,
      temperature: 0.2,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
      return {
        institutionName: institution,
        planVersion: `PMI-${year}.1`,
        createdAt: new Date().toISOString().split('T')[0],
        baselineCompositeScore: baselineScore,
        targetCompositeScore: targetScore,
        actions: parsed.actions || [],
        executiveSummary:
          parsed.executiveSummary ||
          `Plan de Mejora Institucional ${year} enfocado en mitigar brechas prioritarias del marco CAF.`,
      };
    } catch {
      return this.generateImprovementPlan({ ...params, dryRun: true });
    }
  }

  /**
   * Deterministic audit generator for tests or offline execution.
   */
  private synthesizeDeterministicAudit(
    institution: string,
    criteria: Array<(typeof CAF_CRITERIA)[number]>,
    anonymized: AnonymizationResult,
    preservePiiLocally?: boolean,
    usage?: any
  ): CafAuditReport {
    const textLower = anonymized.anonymizedText.toLowerCase();

    const criteriaEvaluated: CafCriterionScore[] = criteria.map((c) => {
      let score = 50;
      const strengths: string[] = [];
      const documentaryGaps: string[] = [];
      const evidenceCitations: string[] = [];

      if (c.id === 1) {
        if (textLower.includes('misión') || textLower.includes('visión') || textLower.includes('liderazgo')) {
          score += 30;
          strengths.push('Misión y visión institucional formalmente documentadas.');
          evidenceCitations.push('Secciones de identidad y marco estratégico.');
        } else {
          documentaryGaps.push('Falta acta de socialización de valores y código de ética docente.');
        }
      } else if (c.id === 2) {
        if (textLower.includes('pei') || textLower.includes('poa') || textLower.includes('plan')) {
          score += 35;
          strengths.push('Plan Operativo Anual (POA) referenciado con metas anuales.');
        } else {
          documentaryGaps.push('Inexistencia de matriz de seguimiento trimestral de metas del PEI.');
        }
      } else if (c.id === 3) {
        if (textLower.includes('capacitación') || textLower.includes('docente')) {
          score += 25;
          strengths.push('Registro de jornadas pedagógicas y capacitación de profesores.');
        } else {
          documentaryGaps.push('Ausencia de plan anual de formación continua basado en competencias.');
        }
      } else if (c.id === 4) {
        if (textLower.includes('tecnología') || textLower.includes('laboratorio') || textLower.includes('recursos')) {
          score += 30;
          strengths.push('Infraestructura tecnológica y laboratorios disponibles.');
        } else {
          documentaryGaps.push('Falta inventario actualizado de licencias y mantenimiento preventivo TI.');
        }
      } else if (c.id === 5) {
        if (textLower.includes('proceso') || textLower.includes('currículo') || textLower.includes('evaluación')) {
          score += 30;
          strengths.push('Mapeo de procesos pedagógicos y rúbricas de evaluación de aula.');
        } else {
          documentaryGaps.push('Manual de procedimientos académicos sin revisión en los últimos 2 años.');
        }
      } else {
        score = 65;
        strengths.push(`Evidencias preliminares para ${c.name}.`);
        documentaryGaps.push(`Falta formalizar registros estadísticos para ${c.name}.`);
      }

      let maturityLevel: CafCriterionScore['maturityLevel'] = 'DEFINIDO';
      if (score >= 85) maturityLevel = 'OPTIMIZADO';
      else if (score >= 75) maturityLevel = 'GESTIONADO';
      else if (score >= 60) maturityLevel = 'DEFINIDO';
      else if (score >= 40) maturityLevel = 'EN_DESARROLLO';
      else maturityLevel = 'INICIAL';

      return {
        criterionId: c.id,
        criterionName: c.name,
        block: c.block,
        score,
        maturityLevel,
        strengths,
        documentaryGaps,
        evidenceCitations,
      };
    });

    const compositeScore = Math.round(
      criteriaEvaluated.reduce((acc, curr) => acc + curr.score, 0) / criteriaEvaluated.length
    );

    let letterGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (compositeScore >= 90) letterGrade = 'A';
    else if (compositeScore >= 80) letterGrade = 'B';
    else if (compositeScore >= 70) letterGrade = 'C';
    else if (compositeScore >= 60) letterGrade = 'D';
    else letterGrade = 'F';

    const allGaps = criteriaEvaluated.flatMap((c) => c.documentaryGaps);
    const allStrengths = criteriaEvaluated.flatMap((c) => c.strengths);

    return {
      institutionName: institution,
      auditDate: new Date().toISOString().split('T')[0],
      compositeScore,
      letterGrade,
      criteriaEvaluated,
      identifiedGaps: allGaps,
      swotMatrix: {
        strengths: allStrengths,
        weaknesses: allGaps,
        opportunities: ['Integración con repositorio seguro en la nube de Velmar.'],
        threats: ['Rechazo en acreditación institucional por falta de evidencias trazables.'],
      },
      privacyTelemetry: anonymized.detectedEntities,
      byokTokenUsage: usage,
    };
  }
}
