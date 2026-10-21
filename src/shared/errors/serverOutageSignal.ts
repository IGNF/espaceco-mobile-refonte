type ServerOutageListener = (status: number | null) => void;

let currentStatus: number | null = null;
const listeners = new Set<ServerOutageListener>();

function notify(): void {
  listeners.forEach((listener) => listener(currentStatus));
}

/** The collaborative API answered with a server error. */
export function reportServerOutage(status: number): void {
  if (currentStatus === status) return;
  currentStatus = status;
  notify();
}

/** Here, when available, we could fetch the message from the server. */
export async function getServerOutageMessage(): Promise<string | null> {
  try {
    // example
    // const response = await fetch('/api/server-outage-message');
    // const data = await response.json();
    // return data.message;
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/** A later response shows the collaborative API is answering again. */
export function clearServerOutage(): void {
  if (currentStatus === null) return;
  currentStatus = null;
  notify();
}

export function subscribeServerOutage(listener: ServerOutageListener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}
