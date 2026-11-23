// Tiny WebAudio synth — no audio files, no network. Every sound is a
// short oscillator blip shaped by hand. M toggles mute; the preference
// is kept in a plain variable so shot mode stays deterministic.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  select() { tone(660, 0.07, 'triangle', 0.08); },
  play() { tone(392, 0.09, 'triangle', 0.1); tone(587, 0.12, 'triangle', 0.1, 0.06); },
  hit() { tone(140, 0.16, 'sawtooth', 0.12, 0, 60); },
  lanternHit() { tone(220, 0.22, 'square', 0.1, 0, 110); tone(880, 0.1, 'sine', 0.06, 0.02); },
  shield() { tone(1180, 0.1, 'sine', 0.09); tone(1560, 0.12, 'sine', 0.07, 0.05); },
  die() { tone(320, 0.25, 'triangle', 0.1, 0, 70); },
  draw() { tone(520, 0.06, 'sine', 0.06); tone(700, 0.06, 'sine', 0.06, 0.05); },
  turn() { tone(440, 0.08, 'triangle', 0.08); tone(440, 0.08, 'triangle', 0.08, 0.12); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'triangle', 0.1, i * 0.15)); },
  error() { tone(180, 0.12, 'square', 0.07); },
};

export function toggleMute() { muted = !muted; return muted; }
export function isMuted() { return muted; }
