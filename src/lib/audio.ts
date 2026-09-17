// src/lib/audio.ts
// Continuous MP3 Order Ringing Manager (strictly plays /order-ring.mp3 only, no synth beeps)

let activeLoopAudio: HTMLAudioElement | null = null;
let isLoopingRinging = false;
let ringWatchdogInterval: number | null = null;
let singleChimeAudio: HTMLAudioElement | null = null;

/**
 * Initializes and unlocks HTML5 Audio permissions on user touch/click for autoplay compliance
 */
export function initAudioUnlock(): void {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    try {
      // Pre-create & unlock /order-ring.mp3 audio instance
      if (!activeLoopAudio) {
        activeLoopAudio = new Audio('/order-ring.mp3');
        activeLoopAudio.preload = 'auto';
        activeLoopAudio.volume = 1.0;
        activeLoopAudio.loop = true;
      }

      // Quick silent play/pause to unlock mobile browser audio restriction
      const p = activeLoopAudio.play();
      if (p !== undefined) {
        p.then(() => {
          if (!isLoopingRinging && activeLoopAudio) {
            activeLoopAudio.pause();
            activeLoopAudio.currentTime = 0;
          }
          console.log('🔊 /order-ring.mp3 unlocked for autoplay');
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Audio unlock error:', e);
    }
  };

  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((event) => {
    window.addEventListener(event, unlock, { once: true, capture: true });
  });
}

/**
 * Starts continuous looping ring sound using ONLY /order-ring.mp3 until staff accepts order
 */
export function startOrderRinging(): void {
  if (isLoopingRinging) return;
  isLoopingRinging = true;
  console.log('🔔 Continuous /order-ring.mp3 ringing STARTED...');

  const playMp3 = () => {
    if (!isLoopingRinging) return;

    if (!activeLoopAudio) {
      activeLoopAudio = new Audio('/order-ring.mp3');
      activeLoopAudio.preload = 'auto';
      activeLoopAudio.volume = 1.0;
      activeLoopAudio.loop = true;

      activeLoopAudio.onended = () => {
        if (isLoopingRinging && activeLoopAudio) {
          activeLoopAudio.currentTime = 0;
          activeLoopAudio.play().catch(() => {});
        }
      };
    }

    activeLoopAudio.currentTime = activeLoopAudio.currentTime || 0;
    activeLoopAudio.volume = 1.0;
    const playPromise = activeLoopAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✅ /order-ring.mp3 playing in continuous loop');
        })
        .catch((err) => {
          console.warn('MP3 playback pending user interaction:', err);
        });
    }
  };

  playMp3();

  // Watchdog interval: ensure MP3 is playing while pending order exists
  if (ringWatchdogInterval !== null) clearInterval(ringWatchdogInterval);
  ringWatchdogInterval = window.setInterval(() => {
    if (!isLoopingRinging) {
      if (ringWatchdogInterval !== null) clearInterval(ringWatchdogInterval);
      ringWatchdogInterval = null;
      return;
    }

    if (activeLoopAudio) {
      if (activeLoopAudio.paused) {
        activeLoopAudio.play().catch(() => {});
      }
    } else {
      playMp3();
    }
  }, 2000);
}

/**
 * Stops continuous looping ring sound immediately when staff accepts the order
 */
export function stopOrderRinging(): void {
  console.log('🔇 Order ringing STOPPED.');
  isLoopingRinging = false;

  if (ringWatchdogInterval !== null) {
    clearInterval(ringWatchdogInterval);
    ringWatchdogInterval = null;
  }

  if (activeLoopAudio) {
    try {
      activeLoopAudio.pause();
      activeLoopAudio.currentTime = 0;
    } catch (e) {
      console.warn('Error stopping audio:', e);
    }
  }

  if (singleChimeAudio) {
    try {
      singleChimeAudio.pause();
      singleChimeAudio.currentTime = 0;
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Returns whether order ringing is currently active
 */
export function isOrderRinging(): boolean {
  return isLoopingRinging;
}

/**
 * Single chime trigger for sound test or manual notification (plays /order-ring.mp3 only)
 */
export function playOrderChime(): void {
  try {
    if (!singleChimeAudio) {
      singleChimeAudio = new Audio('/order-ring.mp3');
      singleChimeAudio.preload = 'auto';
    }
    singleChimeAudio.volume = 1.0;
    singleChimeAudio.currentTime = 0;
    singleChimeAudio.play().catch((err) => {
      console.warn('Could not play order chime:', err);
    });
  } catch (e) {
    console.warn('playOrderChime error:', e);
  }
}

// Auto-run unlock listener on import
if (typeof window !== 'undefined') {
  initAudioUnlock();
}
