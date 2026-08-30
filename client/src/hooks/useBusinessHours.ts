import { useState, useEffect } from 'react';
import { isWithinBusinessHours, getEffectiveSlaStartTime } from '@/lib/businessHours';

/**
 * Custom hook that provides real-time business hours awareness.
 * Updates every 60 seconds to reflect current business hours status.
 *
 * @see Section 3.1 (Business Hours)
 * @see Section 3.2 (SLA Calculation)
 */
export function useBusinessHours() {
  const [isOpen, setIsOpen] = useState(() => isWithinBusinessHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOpen(isWithinBusinessHours());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return { isOpen };
}

export interface TicketSlaAwareness {
  /** Whether the ticket was submitted outside business hours */
  isAfterHours: boolean;
  /** The effective SLA start time (may differ from created_at) */
  effectiveSlaStart: Date;
  /** Formatted SLA start time string */
  formattedSlaStart: string;
}

/**
 * Custom hook that provides SLA awareness for a specific ticket.
 * Computes whether the ticket was submitted outside business hours
 * and when its SLA clock effectively starts.
 *
 * @param createdAt - ISO timestamp string from ticket.created_at
 * @param locale - Current i18n language for date formatting ('en_US' | 'es_DO')
 * @returns SLA awareness object with after-hours flag and effective start time
 * @see Section 3.2
 */
export function useTicketSlaAwareness(
  createdAt?: string | null,
  locale: string = 'en_US',
): TicketSlaAwareness | null {
  if (!createdAt) return null;

  const submissionDate = new Date(createdAt);
  const effectiveSlaStart = getEffectiveSlaStartTime(submissionDate);
  const isAfterHours = effectiveSlaStart.getTime() !== submissionDate.getTime();

  const localeCode = locale === 'es_DO' ? 'es-DO' : 'en-US';
  const formattedSlaStart = effectiveSlaStart.toLocaleString(localeCode, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return { isAfterHours, effectiveSlaStart, formattedSlaStart };
}

export default useBusinessHours;
