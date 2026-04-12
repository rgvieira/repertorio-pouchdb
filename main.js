
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

// Configurações Globais
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');

/**
 * HANDLERS PARA O SCANNER (SISTEMA DE ARQUIVOS)
 * Estes ficam fora da createWindow para serem registrados assim que o app inicia
 */
ipcMain.handle('ler-diretorio', async (event, caminho) => {
    try {
        return fs.readdirSync(caminho);
    } catch (err) {
        console.error("Erro ao ler diretório:", err);
        return [];
    }
});

// ESCUTADOR PARA ABRIR LINKS EXTERNOS
ipcMain.on('abrir-link-externo', (event, url) => {
    shell.openExternal(url);
});

ipcMain.handle('obter-status', async (event, caminho) => {
    try {
        const stat = fs.statSync(caminho);
        return {
            isDirectory: stat.isDirectory(),
            isFile: stat.isFile()
        };
    } catch (err) {
        return { isDirectory: false, isFile: false };
    }
});

ipcMain.handle('abrir-dialogo-pasta', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return canceled ? null : filePaths[0];
});

/**
 * CRIAÇÃO DA JANELA PRINCIPAL
 */
function createWindow() {
    console.log("------------------------------------------");
    console.log("LOG: Iniciando Processo Principal...");
    console.log("Diretório:", __dirname);
    console.log("------------------------------------------");

    win = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Injeção do Preload em janelas filhas (Viewer)
    win.webContents.setWindowOpenHandler(() => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    webSecurity: false,
                    sandbox: false,
                    preload: path.join(__dirname, 'preload.js')
                }
            }
        };
    });

    // --- ESCUTADOR: SALVAR PDF ---
    ipcMain.on('salvar-pdf-direto', async (event, { data, title }) => {
        const nomeLimpo = title.replace(/[\\/:*?"<>|]/g, "").trim();
        const { filePath } = await dialog.showSaveDialog(win, {
            title: 'Salvar Partitura',
            defaultPath: path.join(app.getPath('downloads'), `${nomeLimpo}.pdf`),
            filters: [{ name: 'Arquivos PDF', extensions: ['pdf'] }]
        });

        if (filePath) {
            const base64Data = data.replace(/^data:image\/png;base64,/, "");
            fs.writeFile(filePath, Buffer.from(base64Data, 'base64'), (err) => {
                if (err) console.error("Erro ao gravar arquivo:", err);
            });
        }
    });

    // --- ESCUTADOR: IMPRESSÃO ---
    ipcMain.on('chamar-impressora', async (event, { data, title }) => {
        const nomeLimpo = title.replace(/[\\/:*?"<>|]/g, "").trim();
        
        const tempWin = new BrowserWindow({ 
            show: false, 
            title: nomeLimpo 
        });

        const html = `
            <html>
                <body style="margin:0; padding:0;">
                    <img src="${data}" style="width:100%; display:block;">
                </body>
            </html>`;

        tempWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        tempWin.webContents.on('did-finish-load', () => {
            tempWin.webContents.print({ 
                silent: false, 
                printBackground: true,
                deviceName: '' 
            }, (success, failureCause) => {
                if (!success) console.error("Falha na impressão:", failureCause);
                tempWin.close();
            });
        });
    });

    // Carregamento da página
    win.loadFile(path.join(__dirname, 'www', 'index.html')).then(() => {
        win.webContents.openDevTools();
    });

    win.on('closed', () => { win = null; });
}

// Inicialização do App
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});