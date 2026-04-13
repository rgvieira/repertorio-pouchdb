/**
 * js/scanner.js - Versão Definitiva Híbrida
 * Suporta Electron (Zorin OS) e Cordova (Android)
 */

/**
 * js/folderpicker.js - O Seletor de Pastas para Android
 */
const FolderPicker = {
    raiz: "cdvfile://localhost/sdcard/",
    caminhoAtual: "cdvfile://localhost/sdcard/",
    callback: null,

    abrir(cb) {
        this.callback = cb;
        const modal = document.getElementById('modalPicker');
        if (modal) modal.style.display = 'block';
        this.navegar(this.raiz);
    },

    navegar(path) {
        this.caminhoAtual = path;
        const label = document.getElementById('currentPathLabel');
        if (label) label.innerText = path.replace("cdvfile://localhost/sdcard/", "/armazenamento/");
        
        const lista = document.getElementById('listaPastas');
        lista.innerHTML = "<p style='padding:15px; color:#fff;'>Lendo diretório...</p>";

        window.resolveLocalFileSystemURL(path, (dirEntry) => {
            const reader = dirEntry.createReader();
            reader.readEntries((entries) => {
                lista.innerHTML = "";
                const pastas = entries
                    .filter(e => e.isDirectory && !e.name.startsWith('.'))
                    .sort((a, b) => a.name.localeCompare(b.name));

                pastas.forEach(p => {
                    const item = document.createElement('div');
                    item.style = "padding:16px; border-bottom:1px solid #2c3e50; cursor:pointer; display:flex; align-items:center; color:white;";
                    item.innerHTML = `<span class="material-icons" style="margin-right:12px; color:#f39c12;">folder</span> <span>${p.name}</span>`;
                    item.onclick = () => this.navegar(p.nativeURL);
                    lista.appendChild(item);
                });
            }, (err) => { alert("Erro ao ler pastas: " + err.code); });
        }, (err) => { alert("Erro ao acessar: " + err.code); });
    },

    voltar() {
        if (this.caminhoAtual === this.raiz) return;
        let temp = this.caminhoAtual.replace(/\/$/, ""); 
        let novoPath = temp.substring(0, temp.lastIndexOf("/") + 1);
        if (novoPath.includes("sdcard")) this.navegar(novoPath);
    },

    confirmar() { 
        if (this.callback) this.callback(this.caminhoAtual); 
        this.fechar(); 
    },

    fechar() { 
        const modal = document.getElementById('modalPicker');
        if (modal) modal.style.display = 'none'; 
    }
};

window.FolderPicker = FolderPicker;

/**
 * Busca todas as pastas configuradas no banco e inicia a varredura nelas
 */
async function iniciarVarreduraGeral() {
    console.log("Iniciando varredura em todas as pastas vinculadas...");
    
    try {
        // 1. Pega a lista de pastas que você salvou via addFolder
        const pastasVinculadas = await DBManager.listFolders();
        
        if (pastasVinculadas.length === 0) {
            console.warn("Nenhuma pasta vinculada para escanear.");
            if (window.showToast) window.showToast("Nenhuma pasta configurada", "warning");
            return;
        }

        // 2. Para cada pasta, executa o motor de varredura
        for (const pastaDoc of pastasVinculadas) {
            console.log("Escaneando diretório: " + pastaDoc.path);
            await Scanner.escanearPasta(pastaDoc.path);
        }

        console.log("✅ Varredura geral concluída.");
        
    } catch (err) {
        console.error("Erro na varredura geral:", err);
    }
}

// Expõe para o window para você chamar no botão "Sincronizar"
window.iniciarVarreduraGeral = iniciarVarreduraGeral;

const Scanner = {
    /**
     * Escolhe o diretório inicial dependendo da plataforma
     */
    
    async abrirPicker() {
        if (window.nodeRequire) {
            // AMBIENTE DESKTOP (Electron)
            const { remote } = window.nodeRequire('electron');
            const res = await remote.dialog.showOpenDialog({ 
                properties: ['openDirectory'] 
            });
            return res.canceled ? null : res.filePaths[0];
        } else {
            // AMBIENTE MOBILE (Android)
            return new Promise(res => {
                if (typeof FolderPicker !== 'undefined') {
                    FolderPicker.abrir(path => res(path));
                } else {
                    console.error("Erro: FolderPicker não definido no HTML.");
                    res(null);
                }
            });
        }
    },

    /**
     * Motor principal de varredura
     */
    async escanearPasta(diretorioAlvo) {
        if (!diretorioAlvo) return;
        console.log("Scanner: Iniciando varredura em " + diretorioAlvo);

        if (window.nodeRequire) {
            // Lógica para Zorin OS (Node.js FS)
            const fs = window.nodeRequire('fs');
            const path = window.nodeRequire('path');
            await this.walkDesktop(diretorioAlvo, diretorioAlvo, fs, path);
        } else {
            // Lógica para Android (Cordova File Plugin)
            await this.walkAndroid(diretorioAlvo);
        }
        
        if (window.showToast) window.showToast("Sincronização concluída!", "success");
    },

    /**
     * Varredura Recursiva - Desktop (Zorin OS)
     */
    async walkDesktop(dir, raiz, fs, path) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const caminhoCompleto = path.join(dir, file);
            const stat = fs.statSync(caminhoCompleto);

            if (stat.isDirectory()) {
                if (!file.startsWith('.')) {
                    await this.walkDesktop(caminhoCompleto, raiz, fs, path);
                }
            } else if (file.toLowerCase().endsWith('.pdf')) {
                const nomeDaPasta = (dir === raiz) 
                    ? path.basename(raiz) 
                    : path.basename(dir);

                // A CORRETA DEFINIÇÃO DE MUSICA
                const musica = {
                    _id: caminhoCompleto,
                    nome: file.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
                    pasta: nomeDaPasta,
                    path: caminhoCompleto,
                    tipo: 'musica'
                };

                await window.DBManager.inserirMusica(musica);
            }
        }
    },

    /**
     * Varredura Recursiva - Android (Cordova)
     */
    async walkAndroid(pathAlvo) {
        return new Promise((resolve) => {
            window.resolveLocalFileSystemURL(pathAlvo, (dirEntry) => {
                const reader = dirEntry.createReader();
                reader.readEntries(async (entries) => {
                    for (let entry of entries) {
                        if (entry.isDirectory) {
                            if (!entry.name.startsWith('.')) {
                                await this.walkAndroid(entry.nativeURL);
                            }
                        } else if (entry.name.toLowerCase().endsWith('.pdf')) {
                            // Extrai o nome da pasta pai pela URL
                            const partes = entry.nativeURL.split('/');
                            const nomeDaPasta = partes[partes.length - 2] || "Raiz";

                            // A CORRETA DEFINIÇÃO DE MUSICA (Versão Android)
                            const musica = {
                                _id: entry.nativeURL,
                                nome: entry.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
                                pasta: nomeDaPasta,
                                path: entry.nativeURL,
                                tipo: 'musica'
                            };

                            // No Android, como o PouchDB precisa do binário para exibir offline:
                            await this.processarAnexoAndroid(entry, musica);
                        }
                    }
                    resolve();
                });
            }, (err) => {
                console.error("Erro ao acessar pasta Android:", err);
                resolve();
            });
        });
    },

    /**
     * Lê o arquivo PDF no Android e anexa ao documento do PouchDB
     */
    async processarAnexoAndroid(fileEntry, musicaDoc) {
        return new Promise((resolve) => {
            fileEntry.file(file => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const blob = new Blob([reader.result], { type: 'application/pdf' });
                    
                    // Estrutura de anexo para o PouchDB
                    musicaDoc._attachments = {
                        'partitura.pdf': {
                            content_type: 'application/pdf',
                            data: blob
                        }
                    };

                    await window.DBManager.inserirMusica(musicaDoc);
                    resolve();
                };
                reader.readAsArrayBuffer(file);
            });
        });
    }
};

window.Scanner = Scanner;