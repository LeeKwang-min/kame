export type TRhythmSoundSystem = {
  resume: () => void;
  dispose: () => void;
  playKick: () => void;
  playSnare: () => void;
  playHihat: () => void;
  playHit: (lane: number) => void;
  playMiss: () => void;
  setMasterVolume: (volume: number) => void;
  getMasterVolume: () => number;
  toggleMute: () => void;
  isMuted: () => boolean;
};

export function createRhythmSoundSystem(): TRhythmSoundSystem {
  const audioCtx = new AudioContext();
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.value = 0; // initially muted
  let muted = true;
  let prevVolume = 0.5;

  function setMasterVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    if (clamped > 0) prevVolume = clamped;
    masterGain.gain.setValueAtTime(clamped, audioCtx.currentTime);
  }

  function getMasterVolume(): number {
    return masterGain.gain.value;
  }

  function toggleMute() {
    if (muted) {
      muted = false;
      setMasterVolume(prevVolume);
    } else {
      muted = true;
      setMasterVolume(0);
    }
  }

  function isMuted(): boolean {
    return muted;
  }

  function resume() {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function dispose() {
    audioCtx.close();
  }

  // Kick drum: sine wave 150Hz->50Hz fast descent
  function playKick() {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Snare: white noise + bandpass filter
  function playSnare() {
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    const gainNode = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  // Hi-hat: high-freq noise + short decay
  function playHihat() {
    const bufferSize = audioCtx.sampleRate * 0.05;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gainNode = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);

    noise.start(now);
    noise.stop(now + 0.05);
  }

  // Hit sound: triangle wave per lane (C4, E4, G4, B4)
  const HIT_FREQS = [261.63, 329.63, 392.0, 493.88];
  function playHit(lane: number) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'triangle';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(HIT_FREQS[lane] ?? 440, now);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Miss sound: square wave low buzz
  function playMiss() {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'square';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(80, now);
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  return {
    resume,
    dispose,
    playKick,
    playSnare,
    playHihat,
    playHit,
    playMiss,
    setMasterVolume,
    getMasterVolume,
    toggleMute,
    isMuted,
  };
}
