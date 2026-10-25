import { useEffect, useState } from 'react';

/** Délai pendant lequel les réponses d'un nouvel item sont inactives (évite qu'un double clic réponde à l'item suivant). */
export const ARM_DELAY_MS = 400;

export function useArmed(delayMs: number): boolean {
  const [armed, setArmed] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    const t = setTimeout(() => setArmed(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return armed;
}
