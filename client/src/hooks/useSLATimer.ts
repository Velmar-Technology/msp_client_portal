import { useState, useEffect } from 'react';

/**
 * Custom hook that provides a countdown timer for the SLA 1-hour window.
 * Shows remaining time for warranty/service ticket modifications.
 */
export function useSLATimer(ticketCreatedAt: string, category: string) {
  const SLA_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const applicableCategories = ['WARRANTY', 'SERVICE_OUTAGE'];

  const isApplicable = applicableCategories.includes(category);
  const createdTime = new Date(ticketCreatedAt).getTime();
  const deadline = createdTime + SLA_WINDOW_MS;

  const [remaining, setRemaining] = useState(() => {
    if (!isApplicable) return 0;
    return Math.max(0, deadline - Date.now());
  });

  const [isExpired, setIsExpired] = useState(() => {
    if (!isApplicable) return true;
    return Date.now() > deadline;
  });

  useEffect(() => {
    if (!isApplicable || isExpired) return;

    const interval = setInterval(() => {
      const timeLeft = Math.max(0, deadline - Date.now());
      setRemaining(timeLeft);
      if (timeLeft <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, isApplicable, isExpired]);

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
