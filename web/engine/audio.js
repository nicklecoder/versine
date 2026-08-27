/**
 * Sound.
 *
 * Every sound is synthesised with the Web Audio API — no files to download,
 * nothing to go missing offline, and the whole palette costs a few hundred
 * bytes instead of a folder of samples.
 *
 * Two rules shape the design. Keep it *short*: these fire dozens of times a
 * session, and anything with a tail becomes unbearable by the twentieth
 * problem. And keep the wrong-answer sound *soft* — a harsh buzzer every time
 * a child makes a mistake teaches them to fear the mistake, which is the
 * opposite of what Practice is for.
 */

const STORAGE_KEY = 'mathtrainer.sound';

let ctx = null;
let master = null;
let enabled = read();

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;                          // storage unavailable: sound on
  }
}

/** Browsers refuse to start audio until the user has interacted. */
function context() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * One note.
 * @param {{freq:number, type?:OscillatorType, at?:number, dur?:number,
 *          gain?:number, glideTo?:number}} spec
 */
function note({ freq, type = 'sine', at = 0, dur = 0.12, gain = 0.18, glideTo = null }) {
  const audio = context();
  if (!audio) return;
  const t0 = audio.currentTime + at;

  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);

  const env = audio.createGain();
  // A tiny attack avoids the click you get from starting at full amplitude.
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** A short filtered-noise click, for the clock tick. */
function click({ at = 0, gain = 0.10 } = {}) {
  const audio = context();
  if (!audio) return;
  const t0 = audio.currentTime + at;
  const frames = Math.floor(audio.sampleRate * 0.03);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3;
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;

  const band = audio.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2200;
  band.Q.value = 1.2;

  const env = audio.createGain();
  env.gain.value = gain;

  src.connect(band).connect(env).connect(master);
  src.start(t0);
}

const SOUNDS = {
  /** Two rising notes. Bell-like, over quickly. */
  correct() {
    note({ freq: 880, dur: 0.09, gain: 0.16 });
    note({ freq: 1318.5, at: 0.075, dur: 0.16, gain: 0.14 });
  },

  /** Low and short. Clearly negative, deliberately not punishing. */
  wrong() {
    note({ freq: 174, type: 'sawtooth', dur: 0.16, gain: 0.10, glideTo: 150 });
    note({ freq: 116, type: 'square', dur: 0.16, gain: 0.05 });
  },

  /** Countdown: three at one pitch... */
  beep() {
    note({ freq: 660, type: 'triangle', dur: 0.11, gain: 0.14 });
  },

  /** ...and the last one higher, so "go" is unmistakable. */
  go() {
    note({ freq: 990, type: 'triangle', dur: 0.22, gain: 0.17 });
  },

  /** The clock, for the closing seconds. */
  tick() {
    click({ gain: 0.09 });
  },

  /** Run cleared. */
  pass() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      note({ freq: f, at: i * 0.085, dur: 0.2, gain: 0.14 }));
  },

  /** Ran out of time. Falling, brief, not a funeral. */
  fail() {
    note({ freq: 392, type: 'triangle', dur: 0.16, gain: 0.13 });
    note({ freq: 294, type: 'triangle', at: 0.13, dur: 0.26, gain: 0.12 });
  },
};

/** @param {keyof SOUNDS} name */
export function play(name) {
  if (!enabled) return;
  try {
    SOUNDS[name]?.();
  } catch {
    /* audio is a nicety; never let it break a run */
  }
}

export const soundEnabled = () => enabled;

export function setSoundEnabled(on) {
  enabled = !!on;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* preference just won't persist */
  }
  if (enabled) play('beep');            // confirm it audibly
}

/**
 * Warm the audio context on the first real interaction, so the first sound
 * that matters isn't swallowed by the browser's autoplay policy.
 */
export function unlockOnFirstGesture() {
  const wake = () => {
    context();
    window.removeEventListener('pointerdown', wake);
    window.removeEventListener('keydown', wake);
  };
  window.addEventListener('pointerdown', wake, { once: true });
  window.addEventListener('keydown', wake, { once: true });
}
