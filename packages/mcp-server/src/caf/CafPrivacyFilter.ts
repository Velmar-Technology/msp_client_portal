/**
 * Mapping of placeholder tokens to original sensitive values.
 */
export interface PrivacyMapping {
  placeholderToOriginal: Record<string, string>;
  originalToPlaceholder: Record<string, string>;
}

/**
 * Result structure returned by the privacy anonymizer.
 */
export interface AnonymizationResult {
  anonymizedText: string;
  mapping: Record<string, string>;
  redactionsCount: number;
  detectedEntities: {
    cedulas: number;
    matriculas: number;
    emails: number;
    telefonos: number;
    personas: number;
  };
}

/**
 * In-Memory PII Anonymization and Privacy Shield.
 *
 * Implements strict compliance with Dominican Data Protection Law 172-13:
 * Sanitizes student, faculty, and institutional identifiers prior to external LLM processing,
 * ensuring no sensitive minor or employee records leak to third-party AI APIs.
 */
export class CafPrivacyFilter {
  /**
   * Dominican Cédula regex: formats like 001-1234567-8 or continuous 11 digits.
   */
  private static readonly CEDULA_REGEX = /\b\d{3}[-\s]?\d{7}[-\s]?\d{1}\b/g;

  /**
   * Dominican RNC regex: 9 digits with or without hyphens.
   */
  private static readonly RNC_REGEX = /\b\d{1}[-\s]?\d{2}[-\s]?\d{5}[-\s]?\d{1}\b/g;

  /**
   * School Student ID / Matrícula regex (e.g., 2024-0192, MAT-4491, EST-10294, A0012345).
   */
  private static readonly MATRICULA_REGEX = /\b(?:MAT|EST|ID|ALU)[-\s]?\d{4,8}\b|\b(?:19|20)\d{2}[-\s]\d{3,6}\b/gi;

  /**
   * Standard Email regex.
   */
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  /**
   * Phone number regex (Dominican codes 809, 829, 849, international +1-809...).
   */
  private static readonly PHONE_REGEX = /(?:\+?1[-\s.]?)?(?:\(?8[024]9\)?)[-\s.]?\d{3}[-\s.]?\d{4}\b/g;

  /**
   * Common contextual honorifics / roles in Dominican school environments.
   */
  private static readonly CONTEXTUAL_PERSON_REGEX = /\b(?:Estudiante|Alumno|Alumna|Docente|Profesor|Profesora|Lic\.|Ing\.|Director|Directora|Coordinador|Coordinadora)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b/g;

  /**
   * Anonymizes sensitive educational records in text.
   *
   * @param text - Raw document, minutes, or survey text
   * @param existingMapping - Optional existing token mapping to maintain consistent pseudonymization
   * @returns Anonymized text with replacement dictionary and telemetry
   */
  anonymize(text: string, existingMapping?: Record<string, string>): AnonymizationResult {
    if (!text || typeof text !== 'string') {
      return {
        anonymizedText: '',
        mapping: {},
        redactionsCount: 0,
        detectedEntities: { cedulas: 0, matriculas: 0, emails: 0, telefonos: 0, personas: 0 },
      };
    }

    const mapping: Record<string, string> = { ...(existingMapping || {}) };
    const reverseMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      reverseMap[v] = k;
    }

    let cedulaCounter = 1;
    let matriculaCounter = 1;
    let emailCounter = 1;
    let phoneCounter = 1;
    let personaCounter = 1;

    let cedulaCount = 0;
    let matriculaCount = 0;
    let emailCount = 0;
    let phoneCount = 0;
    let personaCount = 0;

    let sanitized = text;

    const getOrAssign = (original: string, prefix: string, counterGetter: () => number, counterInc: () => void): string => {
      const cleanOriginal = original.trim();
      if (reverseMap[cleanOriginal]) {
        return reverseMap[cleanOriginal];
      }
      const token = `[${prefix}_${String(counterGetter()).padStart(2, '0')}]`;
      counterInc();
      mapping[token] = cleanOriginal;
      reverseMap[cleanOriginal] = token;
      return token;
    };

    // 1. Redact Emails
    sanitized = sanitized.replace(CafPrivacyFilter.EMAIL_REGEX, (match) => {
      emailCount++;
      return getOrAssign(match, 'EMAIL', () => emailCounter, () => emailCounter++);
    });

    // 2. Redact Phone Numbers
    sanitized = sanitized.replace(CafPrivacyFilter.PHONE_REGEX, (match) => {
      phoneCount++;
      return getOrAssign(match, 'TELEFONO', () => phoneCounter, () => phoneCounter++);
    });

    // 3. Redact Cédulas
    sanitized = sanitized.replace(CafPrivacyFilter.CEDULA_REGEX, (match) => {
      cedulaCount++;
      return getOrAssign(match, 'CEDULA', () => cedulaCounter, () => cedulaCounter++);
    });

    // 4. Redact Matrículas
    sanitized = sanitized.replace(CafPrivacyFilter.MATRICULA_REGEX, (match) => {
      matriculaCount++;
      return getOrAssign(match, 'MATRICULA', () => matriculaCounter, () => matriculaCounter++);
    });

    // 5. Redact Contextual Persons (Estudiante Juan Pérez, Docente Ana Soto)
    sanitized = sanitized.replace(CafPrivacyFilter.CONTEXTUAL_PERSON_REGEX, (match, nameGroup) => {
      personaCount++;
      const isStudent = /Estudiante|Alumno|Alumna/i.test(match);
      const prefix = isStudent ? 'ESTUDIANTE' : 'PERSONAL';
      const token = getOrAssign(nameGroup, prefix, () => personaCounter, () => personaCounter++);
      return match.replace(nameGroup, token);
    });

    const totalRedactions = cedulaCount + matriculaCount + emailCount + phoneCount + personaCount;

    return {
      anonymizedText: sanitized,
      mapping,
      redactionsCount: totalRedactions,
      detectedEntities: {
        cedulas: cedulaCount,
        matriculas: matriculaCount,
        emails: emailCount,
        telefonos: phoneCount,
        personas: personaCount,
      },
    };
  }

  /**
   * Restores anonymized tokens back to their original values in an authorized, local context.
   *
   * @param text - Anonymized LLM output or report
   * @param mapping - Dictionary of [TOKEN] -> Original Value
   * @returns De-anonymized text with original identities restored
   */
  deanonymize(text: string, mapping: Record<string, string>): string {
    if (!text || !mapping || Object.keys(mapping).length === 0) {
      return text;
    }

    let restored = text;
    for (const [placeholder, original] of Object.entries(mapping)) {
      // Escape brackets in placeholder for regex replacement
      const escaped = placeholder.replace(/[[\]]/g, '\\$&');
      restored = restored.replace(new RegExp(escaped, 'g'), original);
    }
    return restored;
  }
}
