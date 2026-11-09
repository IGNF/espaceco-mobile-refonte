import { useEffect, useState } from 'react';

import { SLIDE_UP_ANIMATION_MS } from './SlideUpPage';

/**
 * Keeps the last opened value until the sheet has finished sliding down.
 * Callers often clear the model in the same update that sets isOpen to false,
 * which would unmount the sheet before the close transition can run.
 */
export function useSlideUpContent<T>(value: T | null, isOpen: boolean): T | null {
  const [displayedValue, setDisplayedValue] = useState<T | null>(null);

  if (isOpen && value !== null && displayedValue !== value) {
    // Wrapped in an updater so a function value is stored as is instead of being called by React as a state updater.
    setDisplayedValue(() => value);
  }

  useEffect(() => {
    if (isOpen || displayedValue === null) return;
    const timer = window.setTimeout(() => setDisplayedValue(null), SLIDE_UP_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [displayedValue, isOpen]);

  if (isOpen && value !== null) return value;
  return displayedValue;
}
