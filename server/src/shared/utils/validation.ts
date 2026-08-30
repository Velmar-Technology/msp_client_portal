const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string conforms to the standard 8-4-4-4-12 hex UUID format.
 *
 * @param value - Value to validate
 * @returns True if value is a valid UUID format
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export { isUuid as validate };
