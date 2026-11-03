import { Terminal } from '../node_modules/@xterm/xterm/lib/xterm.mjs';
import { FitAddon } from '../node_modules/@xterm/addon-fit/lib/addon-fit.mjs';
import { THEMES, THEME_ORDER } from './themes.js';
import { startRain, stopRain } from './rain.js';
import * as sfx from './sfx.js';

const tabsEl = document.getElementById('tabs');
const stageEl = document.getElementById('stage');
const themeEl = document.getElementById('theme');
const sfxEl = document.getElementById('sfx');

const tabs = [];           // { id, term, fit, pane, tabEl, title }
let active = null;
let theme = localStorage.getItem('theme') || 'matrix';
let seq = 0;

/* ---------- temas ---------- */

for (const key of THEME_ORDER) {
  const o = document.createElement('option');
  o.value = key;
  o.textContent = THEMES[key].label;
  themeEl.appendChild(o);
}

function applyTheme(key) {
  const t = THEMES[key];
  if (!t) return;
  theme = key;
  themeEl.value = key;
  localStorage.setItem('theme', key);

  const r = document.documentElement.style;
  r.setProperty('--chrome', t.ui.chrome);
  r.setProperty('--tab-bg', t.ui.tabBg);
  r.setProperty('--tab-active', t.ui.tabActive);
  r.setProperty('--ui-text', t.ui.text);
  r.setProperty('--border', t.ui.border);
  r.setProperty('--bg', t.xterm.background);
  r.setProperty('--glow', t.glow || 'transparent');
  r.setProperty('--glow-strength', `${t.glowStrength}px`);

  document.body.dataset.glow = t.glow ? 'on' : 'off';
  document.body.dataset.scanlines = t.scanlines ? 'on' : 'off';
  document.body.dataset.rain = t.rain ? 'on' : 'off';
  document.body.dataset.raster = t.raster ? 'on' : 'off';
  sfx.setProfile(key);

  if (t.rain) startRain(t.glow || '#00ff41', t.font);
  else stopRain();

  for (const tab of tabs) {
    tab.term.options.theme = t.xterm;
    tab.term.options.fontFamily = t.font;
    tab.term.options.fontSize = t.fontSize;
    tab.term.options.letterSpacing = t.letterSpacing;
    refit(tab);
  }
}

themeEl.addEventListener('change', () => applyTheme(themeEl.value));

function paintSfxButton() {
  sfxEl.textContent = sfx.isEnabled() ? '\u25B6' : '\u00D7';
  sfxEl.title = sfx.isEnabled() ? 'Sonido activado (\u2318M)' : 'Sonido silenciado (\u2318M)';
  sfxEl.classList.toggle('off', !sfx.isEnabled());
}
sfxEl.addEventListener('click', () => { sfx.toggle(); paintSfxButton(); });
paintSfxButton();

function cycleTheme(dir = 1) {
  const i = THEME_ORDER.indexOf(theme);
  applyTheme(THEME_ORDER[(i + dir + THEME_ORDER.length) % THEME_ORDER.length]);
}

/* ---------- pestañas ---------- */

function refit(tab) {
  try {
    tab.fit.fit();
    window.term.resize(tab.id, tab.term.cols, tab.term.rows);
  } catch {}
}

function setActive(id) {
  active = id;
  for (const t of tabs) {
    const on = t.id === id;
    t.pane.classList.toggle('active', on);
    t.tabEl.classList.toggle('active', on);
    if (on) { refit(t); t.term.focus(); }
  }
}

function renderTabTitles() {
  tabs.forEach((t, i) => { t.titleEl.textContent = `${i + 1}: ${t.title}`; });
}

async function newTab() {
  const id = `t${++seq}`;
  const t = THEMES[theme];

  const pane = document.createElement('div');
  pane.className = 'pane';
  stageEl.appendChild(pane);

  const term = new Terminal({
    theme: t.xterm,
    fontFamily: t.font,
    fontSize: t.fontSize,
    letterSpacing: t.letterSpacing,
    cursorBlink: true,
    cursorStyle: 'block',
    allowTransparency: true,
    scrollback: 10000,
    macOptionIsMeta: true,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(pane);
  fit.fit();

  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  const titleEl = document.createElement('span');
  titleEl.className = 'title';
  const closeEl = document.createElement('span');
  closeEl.className = 'close';
  closeEl.textContent = '✕';
  tabEl.append(titleEl, closeEl);
  tabsEl.appendChild(tabEl);

  const tab = { id, term, fit, pane, tabEl, titleEl, title: 'zsh' };
  tabs.push(tab);

  tabEl.addEventListener('mousedown', (e) => {
    if (e.target === closeEl) return;
    setActive(id);
  });
  closeEl.addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });

  term.onData((d) => {
    if (d === '\r') { sfx.enter(); sfx.chatter(); }
    else if (d === '\u007f') sfx.key();
    else if (d >= ' ') sfx.key();
    window.term.write(id, d);
  });
  term.onTitleChange((title) => { tab.title = title || 'zsh'; renderTabTitles(); });

  await window.term.spawn(id, term.cols, term.rows);
  renderTabTitles();
  setActive(id);
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i === -1) return;
  const tab = tabs[i];
  window.term.kill(id);
  tab.term.dispose();
  tab.pane.remove();
  tab.tabEl.remove();
  tabs.splice(i, 1);
  renderTabTitles();
  if (tabs.length === 0) newTab();
  else if (active === id) setActive(tabs[Math.max(0, i - 1)].id);
}

/* ---------- puente con el pty ---------- */

window.term.onData(({ id, data }) => {
  tabs.find((t) => t.id === id)?.term.write(data);
});
window.term.onExit(({ id }) => closeTab(id));

/* ---------- atajos ---------- */

document.getElementById('newtab').addEventListener('click', newTab);

window.addEventListener('keydown', (e) => {
  if (!e.metaKey) return;
  if (e.key === 't') { e.preventDefault(); newTab(); }
  else if (e.key === 'w') { e.preventDefault(); if (active) closeTab(active); }
  else if (e.key === 'k') { e.preventDefault(); cycleTheme(e.shiftKey ? -1 : 1); }
  else if (e.key === 'm') { e.preventDefault(); sfx.toggle(); paintSfxButton(); }
  else if (/^[1-9]$/.test(e.key)) {
    const t = tabs[Number(e.key) - 1];
    if (t) { e.preventDefault(); setActive(t.id); }
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const t = tabs.find((x) => x.id === active); if (t) refit(t); }, 60);
});

/* ---------- arranque ---------- */

document.fonts.ready.then(() => {
  applyTheme(theme);
  newTab();
  // El audio necesita un gesto del usuario; el primer click o tecla lo despierta.
  const wake = () => { sfx.boot(); window.removeEventListener('mousedown', wake); window.removeEventListener('keydown', wake); };
  window.addEventListener('mousedown', wake);
  window.addEventListener('keydown', wake);
});
