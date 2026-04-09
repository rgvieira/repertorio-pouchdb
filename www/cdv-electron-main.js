const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

const cdvElectronSettings = require('./cdv-electron-settings.json');

let mainWindow;

function createWindow() {
    let appIcon = path.join(__dirname, 'img/logo.png');
    if (fs.existsSync(path.join(__dirname, 'img/app.png'))) appIcon = path.join(__dirname, 'img/app.png');

    const browserWindowOpts = {
        width: cdvElectronSettings.browserWindow.width || 800,
        height: cdvElectronSettings.browserWindow.height || 600,
        icon: appIcon,
        webPreferences: {
            preload: path.join(__dirname, 'cdv-electron-preload.js'), 
            contextIsolation: false, 
            nodeIntegration: true,   
            sandbox: false,
            devTools: true
        }
    };

    mainWindow = new BrowserWindow(browserWindowOpts);

    const indexPath = path.join(__dirname, 'index.html');
    mainWindow.loadFile(indexPath);

    if (browserWindowOpts.webPreferences.devTools) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => { mainWindow = null; });
}

// --- 1. O QUE RESOLVE O ERRO "hasService is not a function" ---
ipcMain.on('cdv-electron-ipc', (event, arg) => {
    try {
        const message = JSON.parse(arg);
        if (message.type === 'hasService') {
            event.returnValue = JSON.stringify({ status: true });
        }
    } catch (e) {
        event.returnValue = JSON.stringify({ status: false, error: e.message });
    }
});

// --- 2. O QUE RESOLVE O ERRO "No handler registered for cdv-plugin-exec" ---
// Este bloco liga o seu Preload ao processo principal
ipcMain.handle('cdv-plugin-exec', async (event, serviceName, action, args) => {
    console.log(`[Bridge] Executando: ${serviceName}.${action}`);
    
    // Por enquanto, apenas retornamos sucesso para o Cordova não travar.
    // Futuramente, aqui você vai carregar os plugins de verdade se precisar.
    return { status: "ok", data: "Comando recebido pelo Electron" };
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});