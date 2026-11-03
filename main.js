const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const pty = require('node-pty');

const shell = process.env.SHELL || '/bin/zsh';
const sessions = new Map();

// Entorno limpio: la shell de esta app usa su propio ZDOTDIR (./shell),
// asi que NO lee ~/.zshrc, ~/.zprofile, starship ni powerlevel10k.
// Tu Ghostty sigue exactamente igual.
function cleanEnv() {
  const { HOME, USER, LOGNAME, SHELL, LANG, TERM_PROGRAM, PATH } = process.env;
  return {
    HOME,
    USER,
    LOGNAME,
    SHELL,
    PATH: PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    LANG: LANG || 'es_ES.UTF-8',
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    TERM_PROGRAM: 'terminal-retro',
    ZDOTDIR: path.join(__dirname, 'shell'),
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 680,
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  ipcMain.handle('pty:spawn', (_e, { id, cols, rows }) => {
    const p = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: os.homedir(),
      env: cleanEnv(),
    });
    p.onData((data) => {
      if (!win.isDestroyed()) win.webContents.send('pty:data', { id, data });
    });
    p.onExit(() => {
      sessions.delete(id);
      if (!win.isDestroyed()) win.webContents.send('pty:exit', { id });
    });
    sessions.set(id, p);
    return { ok: true, shell };
  });

  ipcMain.on('pty:write', (_e, { id, data }) => sessions.get(id)?.write(data));
  ipcMain.on('pty:resize', (_e, { id, cols, rows }) => {
    try { sessions.get(id)?.resize(cols, rows); } catch {}
  });
  ipcMain.on('pty:kill', (_e, { id }) => {
    try { sessions.get(id)?.kill(); } catch {}
    sessions.delete(id);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  for (const p of sessions.values()) { try { p.kill(); } catch {} }
  if (process.platform !== 'darwin') app.quit();
});
