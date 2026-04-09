const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expõe o Node para o seu Scanner de forma segura e direta
contextBridge.exposeInMainWorld('electronAPI', {
    fs: fs,
    path: path,
    readdir: (path) => fs.readdirSync(path, { withFileTypes: true }),
    dirname: (p) => path.dirname(p)
});

console.log("Preload carregado com sucesso!");