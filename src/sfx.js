// Sonido sintetizado con WebAudio: nada de ficheros de audio.
// Cada tema define su "voz": click de tecla, pitido de enter y parloteo de ejecución.

let ctx = null;
let master = null;
let profile = null;
let enabled = localStorage.getItem('sfx') !== 'off';

const PROFILES = {
  // El beep clásico de PC speaker: onda cuadrada seca, sin adornos.
  matrix: {
    click: { freq: 1200, noise: 0.12, gain: 0.035, decay: 0.018 },
    enter: { freq: 800, gain: 0.10, decay: 0.13, type: 'square' },
    chatter: { n: 9, lo: 700, hi: 2000, gain: 0.03, type: 'square', spread: 400 },
  },
  cmd: {
    click: { freq: 1000, noise: 0.10, gain: 0.045, decay: 0.020 },
    enter: { freq: 750, gain: 0.13, decay: 0.16, type: 'square' },   // el BEL de toda la vida
    chatter: { n: 12, lo: 400, hi: 1600, gain: 0.045, type: 'square', spread: 380 },
  },
  powershell: {
    click: { freq: 1100, noise: 0.10, gain: 0.030, decay: 0.016 },
    enter: { freq: 900, gain: 0.08, decay: 0.10, type: 'square' },
    chatter: null,
  },
  commander: {
    click: { freq: 1400, noise: 0.10, gain: 0.040, decay: 0.016 },
    enter: { freq: 1046, gain: 0.11, decay: 0.09, type: 'square' },
    chatter: { n: 7, lo: 900, hi: 2400, gain: 0.04, type: 'square', spread: 260 },
  },
  modern: { click: null, enter: null, chatter: null },
};

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip({ freq, gain, decay, type = 'square' }, at = 0, detune = 0) {
  const c = audio();
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + decay + 0.01);
}

function noiseBurst(amount, gain, decay, freq) {
  const c = audio();
  const t = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * decay));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);

  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = gain * amount;
  src.connect(bp).connect(g).connect(master);
  src.start(t);
}

/* ---------- API ---------- */

export function setProfile(themeKey) {
  profile = PROFILES[themeKey] || PROFILES.modern;
}

export function isEnabled() {
  return enabled;
}

export function toggle() {
  enabled = !enabled;
  localStorage.setItem('sfx', enabled ? 'on' : 'off');
  if (enabled) key();
  return enabled;
}

export function key() {
  if (!enabled || !profile?.click) return;
  const p = profile.click;
  blip({ freq: p.freq, gain: p.gain, decay: p.decay, type: 'square' }, 0, (Math.random() - 0.5) * 120);
  if (p.noise) noiseBurst(p.noise, p.gain, p.decay * 0.6, p.freq * 2);
}

export function enter() {
  if (!enabled || !profile?.enter) return;
  const p = profile.enter;
  blip(p, 0);
}

// Parloteo tipo módem/terminal de los 80 al ejecutar un comando.
export function chatter() {
  if (!enabled || !profile?.chatter) return;
  const p = profile.chatter;
  for (let i = 0; i < p.n; i++) {
    const f = p.lo + Math.random() * (p.hi - p.lo);
    blip({ freq: f, gain: p.gain, decay: 0.022, type: p.type }, (i / p.n) * (p.spread / 1000) + Math.random() * 0.012);
  }
}

export function boot() {
  if (!enabled || !profile?.enter) return;
  const t = profile.enter.type;
  [330, 494, 659].forEach((f, i) =>
    blip({ freq: f, gain: 0.07, decay: 0.16, type: t }, i * 0.085)
  );
}
