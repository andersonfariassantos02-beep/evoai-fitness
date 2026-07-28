let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

export function unlockRestAudio() {
  try {
    const context = getAudioContext();
    if (!context) return;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.01);
  } catch {
    // O aviso visual continua disponível quando o navegador bloqueia áudio.
  }
}

export function playRestFinishedSound() {
  try {
    const context = getAudioContext();
    if (!context) return;
    void context.resume();
    [0, 0.22, 0.44].forEach((delay, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = index === 2 ? 1100 : 880;
      gain.gain.setValueAtTime(0.16, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.18);
    });
  } catch {
    // O aviso visual continua disponível quando o navegador bloqueia áudio.
  }
}
