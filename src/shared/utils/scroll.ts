function getActiveScrollRoot(): HTMLElement | null {
  const scrollRoots = Array.from(
    document.querySelectorAll<HTMLElement>('[data-scroll-root="true"]')
  );

  for (let index = scrollRoots.length - 1; index >= 0; index -= 1) {
    const scrollRoot = scrollRoots[index];

    if (scrollRoot.getClientRects().length === 0 || scrollRoot.scrollHeight <= scrollRoot.clientHeight) {
      continue;
    }

    return scrollRoot;
  }

  return null;
}

export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const scrollRoot = getActiveScrollRoot();

  if (scrollRoot) {
    scrollRoot.scrollTo({ top: 0, behavior });
    return;
  }

  if (document.scrollingElement) {
    document.scrollingElement.scrollTo({ top: 0, behavior });
    return;
  }

  window.scrollTo({ top: 0, behavior });
}
