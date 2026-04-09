const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let win;

// Mata a aceleração de hardware que causa tela branca em GPUs Windows
app.disableHardwareAcceleration();

function createWindow() {
    win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Essencial para o PouchDB acessar o disco no Windows
        }
    });

    // O PULO DO GATO: Aponta para a pasta www onde o Cordova guarda tudo
    const indexPath = path.join(__dirname, 'www', 'index.html');

    win.loadFile(indexPath).then(() => {
        console.log("Sistema carregado da pasta WWW");
    }).catch(err => {
        console.error("ERRO: Não achei o index.html dentro da WWW!", err);
    });

    win.webContents.openDevTools();

    win.on('closed', () => {
        win = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});