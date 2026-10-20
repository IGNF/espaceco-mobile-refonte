type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

/**
 * 'toAppError' calls this for the terminal auth codes
 */
export function reportSessionExpired(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
