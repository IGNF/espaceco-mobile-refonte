/**
 * Runs `callback` once the browser has painted the next frame, so that a slow task does not delay
 * the display of what React has just rendered. Returns a function that cancels the call.
 */
export function runAfterNextPaint(callback: () => void): () => void {
  let timeoutId: number | undefined;
  // requestAnimationFrame runs just before the paint, and setTimeout just after it.
  const frameId = window.requestAnimationFrame(() => {
    timeoutId = window.setTimeout(callback);
  });

  return () => {
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(timeoutId);
  };
}
