import { useCallback, useEffect, useRef } from 'react';

export interface UseAudioBeepOptions {
  frequency?: number;
  gain?: number;
  durationMs?: number;
}

const DEFAULT_FREQUENCY = 880;
const DEFAULT_GAIN = 0.03;
const DEFAULT_DURATION_MS = 70;

/**
 * Lightweight audio beep helper based on Web Audio API.
 */
export function useAudioBeep(options: UseAudioBeepOptions = {}) {
  const {
    frequency = DEFAULT_FREQUENCY,
    gain = DEFAULT_GAIN,
    durationMs = DEFAULT_DURATION_MS,
  } = options;

  const audioContextRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    if (typeof window === 'undefined' || !window.AudioContext) {
      return;
    }

    try {
      const audioContext = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(gain, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + (durationMs / 1000));
    } catch {
      console.warn('useAudioBeep.play: some browsers/devices may block audio context creation');
    }
  }, [durationMs, frequency, gain]);

  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;
      if (audioContext) {
        void audioContext.close();
      }
      audioContextRef.current = null;
    };
  }, []);

  return { play };
}
