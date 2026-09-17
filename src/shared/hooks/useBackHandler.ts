import { useEffect, useRef } from 'react';

interface BackHandler {
  id: number;
  zIndex: number;
  dismiss: () => void;
}

let nextHandlerId = 0;
const handlers: BackHandler[] = [];

export function registerBackHandler(dismiss: () => void, zIndex: number): () => void {
  const handler: BackHandler = {
    id: nextHandlerId++,
    zIndex,
    dismiss,
  };
  handlers.push(handler);

  return () => {
    const index = handlers.findIndex((item) => item.id === handler.id);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  };
}

export function dismissTopBackHandler(): boolean {
  if (handlers.length === 0) {
    return false;
  }

  let topHandler = handlers[0];
  for (const handler of handlers) {
    if (handler.zIndex >= topHandler.zIndex) {
      topHandler = handler;
    }
  }

  topHandler.dismiss();
  return true;
}

export function useBackHandler(isActive: boolean, onBack: () => void, zIndex: number): void {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    return registerBackHandler(() => {
      onBackRef.current();
    }, zIndex);
  }, [isActive, zIndex]);
}
