import { useEffect, useRef } from 'react';

/**
 * Hook personnalisé useInterval sécurisé contre les race conditions et les re-renders
 * @param callback Fonction à exécuter périodiquement
 * @param delay Intervalle en millisecondes (ou null pour mettre en pause)
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || delay <= 0) return;

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}
