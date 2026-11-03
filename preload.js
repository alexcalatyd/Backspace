const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('term', {
  spawn: (id, cols, rows) => ipcRenderer.invoke('pty:spawn', { id, cols, rows }),
  write: (id, data) => ipcRenderer.send('pty:write', { id, data }),
  resize: (id, cols, rows) => ipcRenderer.send('pty:resize', { id, cols, rows }),
  kill: (id) => ipcRenderer.send('pty:kill', { id }),
  onData: (cb) => ipcRenderer.on('pty:data', (_e, p) => cb(p)),
  onExit: (cb) => ipcRenderer.on('pty:exit', (_e, p) => cb(p)),
});
