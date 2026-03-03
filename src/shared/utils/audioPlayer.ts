export interface AudioPlayer {
  play: () => void;
  stop: () => void;
  destroy: () => void;
}

function createNoopAudioPlayer(): AudioPlayer {
  return {
    play: () => {},
    stop: () => {},
    destroy: () => {},
  };
}

/**
 * Lightweight helper around HTMLAudioElement for short UI sounds.
 */
export function createAudioPlayer(source: string): AudioPlayer {
  if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
    return createNoopAudioPlayer();
  }

  const audio = new window.Audio(source);
  audio.preload = 'auto';
  let hasPlayWarning = false;
  let hasStopWarning = false;

  const play = () => {
    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        if (hasPlayWarning) return;
        hasPlayWarning = true;
        console.warn('createAudioPlayer.play: sound playback may be blocked by device/browser policy');
      });
    } catch {
      if (hasPlayWarning) return;
      hasPlayWarning = true;
      console.warn('createAudioPlayer.play: unable to play audio');
    }
  };

  const stop = () => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      if (hasStopWarning) return;
      hasStopWarning = true;
      console.warn('createAudioPlayer.stop: unable to stop audio');
    }
  };

  const destroy = () => {
    stop();
    audio.removeAttribute('src');
    audio.load();
  };

  return {
    play,
    stop,
    destroy,
  };
}

/**
 * Play a one-shot sound that should not be tied to a long-lived player lifecycle.
 */
export function playAudioOnce(source: string): void {
  if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
    return;
  }

  try {
    const audio = new window.Audio(source);
    audio.preload = 'auto';

    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load();
    };

    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });

    void audio.play().catch(() => {
      console.warn('playAudioOnce: sound playback may be blocked by device/browser policy');
      cleanup();
    });
  } catch {
    console.warn('playAudioOnce: unable to play audio');
  }
}
