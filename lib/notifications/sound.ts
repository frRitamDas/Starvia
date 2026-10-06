const STORAGE_KEY = "starvia-notification-sound";

let audioContext: AudioContext | null = null;

export function notificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Settings remain usable even when storage is blocked.
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) return null;
  audioContext ??= new AudioContextCtor();
  return audioContext;
}

/**
 * Prime/resume the Web Audio context from a user gesture.
 * Browsers can block autoplay audio until the student interacts with the page.
 */
export async function primeNotificationSound(): Promise<void> {
  const context = getAudioContext();
  if (!context) return;
  try {
    if (context.state === "suspended") await context.resume();
  } catch {
    // Audio is enhancement-only; never block the UI.
  }
}

/**
 * A deliberately short, quiet two-tone stereo chime generated locally.
 * No audio asset/network request is needed.
 */
export async function playNotificationSound(options: { force?: boolean } = {}): Promise<void> {
  if (!options.force && !notificationSoundEnabled()) return;

  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state === "suspended") await context.resume();
    if (context.state !== "running") return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.085, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    master.connect(context.destination);

    const left = context.createOscillator();
    const right = context.createOscillator();
    const leftGain = context.createGain();
    const rightGain = context.createGain();

    left.type = "sine";
    right.type = "sine";
    left.frequency.setValueAtTime(659.25, now);
    right.frequency.setValueAtTime(880, now + 0.035);

    leftGain.gain.setValueAtTime(0, now);
    leftGain.gain.linearRampToValueAtTime(0.68, now + 0.018);
    leftGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    rightGain.gain.setValueAtTime(0, now + 0.02);
    rightGain.gain.linearRampToValueAtTime(0.52, now + 0.055);
    rightGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    const leftPan = context.createStereoPanner();
    const rightPan = context.createStereoPanner();
    leftPan.pan.setValueAtTime(-0.18, now);
    rightPan.pan.setValueAtTime(0.18, now);

    left.connect(leftGain).connect(leftPan).connect(master);
    right.connect(rightGain).connect(rightPan).connect(master);

    left.start(now);
    right.start(now + 0.02);
    left.stop(now + 0.3);
    right.stop(now + 0.36);
  } catch {
    // Notifications must never throw because an audio API is unavailable.
  }
}

export const NOTIFICATION_SOUND_STORAGE_KEY = STORAGE_KEY;
