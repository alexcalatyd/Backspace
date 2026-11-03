// Lluvia Matrix en un canvas de fondo.
const canvas = document.getElementById('rain');
const ctx = canvas.getContext('2d');
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789$+-*/=<>#@';

let raf = null;
let drops = [];
let fontSize = 16;
let color = '#00ff41';
let family = 'monospace';
let last = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cols = Math.ceil(innerWidth / fontSize);
  drops = Array.from({ length: cols }, () => Math.random() * -50);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function frame(ts) {
  raf = requestAnimationFrame(frame);
  if (ts - last < 55) return;   // ~18 fps, más cinematográfico y barato
  last = ts;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';   // estela
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.font = `${fontSize}px ${family}`;
  ctx.textBaseline = 'top';

  for (let i = 0; i < drops.length; i++) {
    const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
    const x = i * fontSize;
    const y = drops[i] * fontSize;

    ctx.fillStyle = '#d8ffe4';              // cabeza brillante
    ctx.fillText(ch, x, y);
    ctx.fillStyle = color;                  // cuerpo
    ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y - fontSize);

    if (y > innerHeight && Math.random() > 0.975) drops[i] = 0;
    else drops[i] += 1;
  }
}

export function startRain(glowColor, fontFamily) {
  color = glowColor;
  family = fontFamily || 'monospace';
  if (raf) return;
  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);
}

export function stopRain() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = null;
  window.removeEventListener('resize', resize);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
}
