/**
 * Formats an ISO date string, timestamp, or Date object into a localized relative time string
 * (e.g. "5 minutes ago", "hace 2 horas", "yesterday", "ayer") using the native browser Intl.RelativeTimeFormat API.
 *
 * @param dateInput - The target date to format.
 * @param locale - BCP 47 language tag or i18next locale code (e.g., "en_US", "es_DO", "en-US").
 * @param style - Formatting style ("long", "short", or "narrow"). Defaults to "short".
 */
export function formatRelativeTime(
  dateInput: string | Date | number,
  locale: string = "en-US",
  style: "long" | "short" | "narrow" = "short"
): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

  if (isNaN(diffInSeconds)) return String(dateInput);

  const langTag = (locale || "en-US").replace("_", "-");

  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(langTag, { numeric: "auto", style });
  } catch {
    rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto", style });
  }

  const absSec = Math.abs(diffInSeconds);
  if (absSec < 45) {
    return rtf.format(Math.round(diffInSeconds), "second");
  }

  const diffInMinutes = Math.round(diffInSeconds / 60);
  const absMin = Math.abs(diffInMinutes);
  if (absMin < 45) {
    return rtf.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  const absHour = Math.abs(diffInHours);
  if (absHour < 22) {
    return rtf.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  const absDay = Math.abs(diffInDays);
  if (absDay < 26) {
    return rtf.format(diffInDays, "day");
  }

  const diffInMonths = Math.round(diffInDays / 30);
  const absMonth = Math.abs(diffInMonths);
  if (absMonth < 11) {
    return rtf.format(diffInMonths, "month");
  }

  const diffInYears = Math.round(diffInDays / 365);
  return rtf.format(diffInYears, "year");
}
