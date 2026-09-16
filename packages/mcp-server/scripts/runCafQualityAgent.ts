#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { CafQualityAgent } from '../src/caf/CafQualityAgent.js';
import { CafPrivacyFilter } from '../src/caf/CafPrivacyFilter.js';
import { ByokLlmClient } from '../src/byok/ByokLlmClient.js';

// Load local environment variables
dotenv.config();

async function main() {
  console.log('='.repeat(80));
  console.log('  🏛️  AGENTE CAF DE CALIDAD EDUCATIVA & SERVICIO PRIVADO MCP');
  console.log('  Powered by Velmar Technology — AIaaS para Centros Educativos');
  console.log('='.repeat(80));

  const hasApiKey = Boolean(process.env.BYOK_DEFAULT_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  const isDryRun = !hasApiKey;

  console.log(`\n🔑 Modo de Ejecución: ${hasApiKey ? 'ONLINE (Llave de API detectada)' : 'SIMULADO / DRY-RUN (Sin costo de tokens)'}`);
  if (!hasApiKey) {
    console.log('   * Nota: Para ejecutar inferencia real con LLM externo, define BYOK_DEFAULT_API_KEY o OPENAI_API_KEY en tu entorno.');
  }

  const privacyFilter = new CafPrivacyFilter();
  const llmClient = new ByokLlmClient();
  const agent = new CafQualityAgent(llmClient, privacyFilter);

  // 1. Evidencia Documental Simulada
  const sampleEvidence = `
    CENTRO EDUCATIVO COLEGIO BILINGÜE METROPOLITANO (SANTO DOMINGO, R.D.)
    PLAN OPERATIVO ANUAL (POA) Y MEMORIA DE GESTIÓN ACADÉMICA 2025-2026

    1. LIDERAZGO INSTITUCIONAL (Criterio 1):
    El Consejo Directivo, presidido por la Directora Carmen Morales (cédula 001-0876543-2),
    ha formalizado la Misión y Visión con enfoque en competencias digitales y valores éticos.
    Reuniones bimensuales registradas en libro de actas físico. Código de ética docente pendiente
    de ratificación por la asamblea general.

    2. ESTRATEGIA Y PLANIFICACIÓN (Criterio 2):
    El Plan Estratégico Institucional (PEI) 2024-2028 define metas de retención estudiantil del 95%
    y bilingüismo progresivo. Sin embargo, no se cuenta con un cuadro de mando integral digital
    para medir el cumplimiento trimestral de los indicadores de gestión.

    3. GESTIÓN DE PERSONAS (Criterio 3):
    La nómina docente incluye 45 profesores coordinados por el Lic. Rafael Peña (teléfono 809-555-8899,
    correo r.pena@colegio.edu.do). En enero se impartió un taller de 20 horas en herramientas de IA educativa.
    Falta formalizar el protocolo de inducción para nuevos docentes y el plan de evaluación por desempeño.

    4. ALIANZAS Y RECURSOS (Criterio 4):
    Infraestructura: Dos laboratorios de informática con 30 equipos cada uno, enlace de fibra óptica
    gestionado por Velmar Technology y firewall perimetral. Falta implementar política de respaldo
    automatizado en la nube (Velmar Cloud) para expedientes de notas históricas.

    5. PROCESOS Y GESTIÓN ACADÉMICA (Criterio 5):
    El Estudiante Carlos Santana (matrícula 2023-0492) y la Estudiante Laura Méndez (matrícula 2024-0115)
    fueron seleccionados para el programa de tutoría entre pares. Se utilizan rúbricas de evaluación
    estandarizadas según el currículo oficial del MINERD.
  `;

  console.log('\n--------------------------------------------------------------------------------');
  console.log('🛡️  PASO 1: APLICANDO FILTRO DE PRIVACIDAD LOCAL (LEY DOMINICANA 172-13)');
  console.log('--------------------------------------------------------------------------------');

  const piiResult = privacyFilter.anonymize(sampleEvidence);
  console.log(`✅ Entidades Sensibles Detectadas y Sanitizadas en Memoria:`);
  console.log(`   - Cédulas / Identificaciones: ${piiResult.detectedEntities.cedulas}`);
  console.log(`   - Matrículas Estudiantiles:   ${piiResult.detectedEntities.matriculas}`);
  console.log(`   - Correos Electrónicos:       ${piiResult.detectedEntities.emails}`);
  console.log(`   - Números de Teléfono:        ${piiResult.detectedEntities.telefonos}`);
  console.log(`   - Nombres de Personal/Alumnos:${piiResult.detectedEntities.personas}`);
  console.log(`   - Total de tokens redactados: ${piiResult.redactionsCount}`);

  console.log('\n--------------------------------------------------------------------------------');
  console.log('📊 PASO 2: AUDITORÍA DE EVIDENCIAS SEGÚN LOS 9 CRITERIOS DEL MODELO CAF');
  console.log('--------------------------------------------------------------------------------');

  const auditReport = await agent.auditEvidence({
    documentText: sampleEvidence,
    institutionName: 'Colegio Bilingüe Metropolitano',
    dryRun: isDryRun,
    preservePiiLocally: false,
  });

  console.log(`🏛️  Institución:        ${auditReport.institutionName}`);
  console.log(`📅  Fecha de Auditoría: ${auditReport.auditDate}`);
  console.log(`🎯  Puntaje Global CAF: ${auditReport.compositeScore} / 100  (Calificación: Grado ${auditReport.letterGrade})`);
  console.log(`📋  Criterios Auditados: ${auditReport.criteriaEvaluated.length}`);

  console.log('\nDetalle de Criterios Evaluados:');
  auditReport.criteriaEvaluated.forEach((c) => {
    const icon = c.score >= 80 ? '🟢' : c.score >= 65 ? '🟡' : '🔴';
    console.log(`  ${icon} Criterio ${c.criterionId} [${c.block}]: ${c.criterionName.padEnd(35)} | Score: ${String(c.score).padStart(3)}% | Nivel: ${c.maturityLevel}`);
    if (c.documentaryGaps.length > 0) {
      console.log(`     ⚠️  Brecha Documental: ${c.documentaryGaps[0]}`);
    }
  });

  console.log('\n--------------------------------------------------------------------------------');
  console.log('💬 PASO 3: ANÁLISIS PSICOMÉTRICO DE ENCUESTAS (CRITERIOS 6 Y 7)');
  console.log('--------------------------------------------------------------------------------');

  const sampleSurveys = [
    { respondentType: 'STUDENT' as const, feedback: 'Los profesores nos explican con paciencia y los laboratorios están geniales.', rating: 5 },
    { respondentType: 'STUDENT' as const, feedback: 'El internet en los salones a veces se corta cuando todos nos conectamos.', rating: 3 },
    { respondentType: 'TEACHER' as const, feedback: 'Excelente liderazgo del equipo directivo y buena capacitación en enero.', rating: 5 },
    { respondentType: 'PARENT' as const, feedback: 'Buena comunicación por circulares, pero quisiéramos acceso web directo a las calificaciones.', rating: 4 },
  ];

  const surveyAnalysis = await agent.analyzeSurveySentiment({
    surveys: sampleSurveys,
    dryRun: isDryRun,
  });

  console.log(`📈 Satisfacción General de la Comunidad Escolar: ${surveyAnalysis.overallSatisfactionPercentage}%`);
  console.log(`   - Sentimiento Positivo: ${surveyAnalysis.sentimentSummary.positivePercentage}%`);
  console.log(`   - Sentimiento Neutro:   ${surveyAnalysis.sentimentSummary.neutralPercentage}%`);
  console.log(`   - Sentimiento Negativo: ${surveyAnalysis.sentimentSummary.negativePercentage}%`);
  console.log(`   - Impacto Criterio 6 (Alumnos y Familias): ${surveyAnalysis.cafCriterionImpact.criterion6Score}/100`);
  console.log(`   - Impacto Criterio 7 (Personal Docente):   ${surveyAnalysis.cafCriterionImpact.criterion7Score}/100`);

  console.log('\n--------------------------------------------------------------------------------');
  console.log('🚀 PASO 4: PLAN DE MEJORA INSTITUCIONAL (PMI) GENERADO AUTOMÁTICAMENTE');
  console.log('--------------------------------------------------------------------------------');

  const pmi = await agent.generateImprovementPlan({
    auditReport,
    targetYear: 2026,
    dryRun: isDryRun,
  });

  console.log(`📑 Versión del Plan: ${pmi.planVersion} (Meta: Incrementar de ${pmi.baselineCompositeScore}% a ${pmi.targetCompositeScore}%)`);
  console.log(`📝 Resumen Ejecutivo: ${pmi.executiveSummary}`);
  console.log('\nAcciones Priorizadas del Plan de Mejora:');

  pmi.actions.forEach((action, i) => {
    console.log(`  [${action.id}] Prioridad: ${action.priority} | Plazo: ${action.targetTimeline} | Resp: ${action.responsibleRole}`);
    console.log(`    🎯 Objetivo SMART: ${action.smartObjective}`);
    console.log(`    📊 Indicador KPI:  ${action.kpiIndicator}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('  ✨ Demostración completada con éxito. Servicios listos para MCP y Velmar.');
  console.log('='.repeat(80) + '\n');
}

main().catch((err) => {
  console.error('[Error al ejecutar Agente CAF]:', err);
  process.exit(1);
});
