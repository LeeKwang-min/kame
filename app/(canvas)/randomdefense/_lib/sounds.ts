// ─── Random Defense Sound System ───
// Procedural sounds using Web Audio API (OscillatorNode)
// No external audio files needed

export type TSoundSystem = {
  resume: () => void;
  dispose: () => void;
  playSummon: (tier: number) => void;
  playMerge: (tier: number) => void;
  playShoot: () => void;
  playKill: () => void;
  playBossEntry: () => void;
  playBossKill: () => void;
  playLifeLost: () => void;
  playWaveStart: () => void;
  playGameOver: () => void;
  playGold: () => void;
  setMasterVolume: (volume: number) => void;
  getMasterVolume: () => number;
};

export function createSoundSystem(): TSoundSystem {
  const audioCtx = new AudioContext();
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.value = 1.0;
  let masterVolume = 1.0;
  let prevVolume = 1.0; // for mute toggle

  function setMasterVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    if (clamped > 0) prevVolume = clamped;
    masterVolume = clamped;
    masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
  }

  function getMasterVolume(): number {
    return masterVolume;
  }

  function resume() {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function dispose() {
    audioCtx.close();
  }

  // ─── Helper: create an oscillator with envelope ───
  function playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain: number = 0.15,
    freqEnd?: number,
    startDelay: number = 0,
  ) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = type;
    const startTime = audioCtx.currentTime + startDelay;
    const endTime = startTime + duration;

    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, endTime);
    }

    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.start(startTime);
    osc.stop(endTime);
  }

  // ─── Summon: rising tone, higher pitch for higher tier ───
  function playSummon(tier: number) {
    const baseFreq = 300 + (tier - 1) * 80;
    playTone(baseFreq, 0.15, 'sine', 0.18, baseFreq * 2);
    playTone(baseFreq * 1.5, 0.1, 'triangle', 0.1, baseFreq * 2.5, 0.05);
  }

  // ─── Merge: sparkle chord, two oscillators ───
  function playMerge(tier: number) {
    const baseFreq = 400 + (tier - 1) * 60;
    playTone(baseFreq, 0.25, 'sine', 0.2, baseFreq * 1.5);
    playTone(baseFreq * 1.25, 0.2, 'triangle', 0.15, baseFreq * 2, 0.05);
    playTone(baseFreq * 1.5, 0.15, 'sine', 0.1, baseFreq * 2.5, 0.1);
  }

  // ─── Shoot: short pulse ───
  function playShoot() {
    playTone(800, 0.05, 'square', 0.08);
  }

  // ─── Kill: descending tone ───
  function playKill() {
    playTone(400, 0.15, 'sine', 0.12, 100);
  }

  // ─── Boss Entry: deep rumble + warning ───
  function playBossEntry() {
    // Deep rumble
    playTone(80, 0.5, 'sawtooth', 0.2, 60);
    // Warning siren
    playTone(500, 0.3, 'square', 0.15, 700, 0.1);
    playTone(700, 0.3, 'square', 0.15, 500, 0.4);
  }

  // ─── Boss Kill: explosion + fanfare ───
  function playBossKill() {
    // Explosion rumble
    playTone(100, 0.3, 'sawtooth', 0.2, 30);
    // Fanfare rising
    playTone(400, 0.15, 'triangle', 0.18, 500, 0.1);
    playTone(500, 0.15, 'triangle', 0.18, 600, 0.25);
    playTone(600, 0.25, 'triangle', 0.2, 800, 0.4);
  }

  // ─── Life Lost: warning buzzer ───
  function playLifeLost() {
    playTone(200, 0.2, 'triangle', 0.2, 150);
    playTone(180, 0.2, 'triangle', 0.18, 130, 0.2);
  }

  // ─── Wave Start: horn two-note rise ───
  function playWaveStart() {
    playTone(350, 0.15, 'triangle', 0.18, 400);
    playTone(450, 0.2, 'triangle', 0.2, 550, 0.15);
  }

  // ─── Game Over: descending three notes ───
  function playGameOver() {
    playTone(500, 0.25, 'sine', 0.2);
    playTone(400, 0.25, 'sine', 0.18, undefined, 0.3);
    playTone(250, 0.4, 'sine', 0.2, undefined, 0.6);
  }

  // ─── Gold: coin tick ───
  function playGold() {
    playTone(1200, 0.06, 'square', 0.1, 1600);
  }

  return {
    resume,
    dispose,
    playSummon,
    playMerge,
    playShoot,
    playKill,
    playBossEntry,
    playBossKill,
    playLifeLost,
    playWaveStart,
    playGameOver,
    playGold,
    setMasterVolume,
    getMasterVolume,
  };
}
