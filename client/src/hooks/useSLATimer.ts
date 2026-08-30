import { useState, useEffect } from 'react';
import { getEffectiveSlaStartTime } from '@/lib/businessHours';

export interface SLATimerTicketInput {
  created_at?: string;
  category?: string;
}

/**
 * Custom hook that provides a real-time countdown timer for the 1-hour SLA cancellation window.
 * Displays remaining time for eligible warranty and service outage tickets.
 *
 * @see BL-101 (1-Hour SLA Cancellation)
 * @param ticketOrCreatedAt - Ticket object or ISO timestamp string of creation time.
 * @param categoryParam - Optional ticket category string if timestamp string is passed as first argument.
 * @returns Object with remaining milliseconds, countdown minutes, seconds, formatted time string, and expired flag.
 */
export function useSLATimer(
  ticketOrCreatedAt?: SLATimerTicketInput | string | null,
  categoryParam?: string | null
) {
  const SLA_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const applicableCategories = ['WARRANTY', 'SERVICE_OUTAGE'];

  let createdAtStr = '';
  let categoryStr = '';

  if (typeof ticketOrCreatedAt === 'string') {
    createdAtStr = ticketOrCreatedAt;
    categoryStr = categoryParam || '';
  } else if (ticketOrCreatedAt && typeof ticketOrCreatedAt === 'object') {
    createdAtStr = ticketOrCreatedAt.created_at || '';
    categoryStr = ticketOrCreatedAt.category || '';
  }

  const isApplicable = applicableCategories.includes(categoryStr) && !!createdAtStr;
  const effectiveStartTime = createdAtStr ? getEffectiveSlaStartTime(new Date(createdAtStr)).getTime() : 0;
  const deadline = effectiveStartTime + SLA_WINDOW_MS;

  const [remaining, setRemaining] = useState(() => {
    if (!isApplicable || !createdAtStr) return 0;
    return Math.max(0, deadline - Date.now());
  });

  const [isExpired, setIsExpired] = useState(() => {
    if (!isApplicable || !createdAtStr) return true;
    return Date.now() > deadline;
  });

  useEffect(() => {
    if (!isApplicable || !createdAtStr) {
      setRemaining(0);
      setIsExpired(true);
      return;
    }

    const currentRemaining = Math.max(0, deadline - Date.now());
    setRemaining(currentRemaining);
    setIsExpired(currentRemaining <= 0);

    if (currentRemaining <= 0) return;

    const interval = setInterval(() => {
      const timeLeft = Math.max(0, deadline - Date.now());
      setRemaining(timeLeft);
      if (timeLeft <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, isApplicable, createdAtStr]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return {
    isApplicable,
    isExpired,
    remaining,
    minutes,
    seconds,
    formattedTime: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
}

export default useSLATimer;
