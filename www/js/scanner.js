/**
 * js/scanner.js - Versão Definitiva Híbrida
 * Suporta Electron (Zorin OS) e Cordova (Android)
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

async function iniciarVarreduraGeral() {
    console.log("Iniciando varredura em todas as pastas vinculadas...");
    
    try {
        const pastasVinculadas = await DBManager.listFolders();
        
        if (pastasVinculadas.length === 0) {
            console.warn("Nenhuma pasta vinculada para escanear.");
            if (window.showToast) window.showToast("Nenhuma pasta configurada", "warning");
            return;
        }

        for (const pastaDoc of pastasVinculadas) {
            console.log("Escaneando diretório: " + pastaDoc.path);
            await Scanner.escanearPasta(pastaDoc.path);
        }

        console.log("✅ Varredura geral concluída.");
        
    } catch (err) {
        console.error("Erro na varredura geral:", err);
    }
}

window.iniciarVarreduraGeral = iniciarVarreduraGeral;
// NO COMEÇO do scanner.js, APÓS o const Scanner = {

// Verifica se SAF plugin está disponível
const hasSAFPlugin = typeof window.SAFMediaStore !== 'undefined';
console.log('🔌 SAF Plugin disponível:', hasSAFPlugin);
const Scanner = {
    
    async abrirPicker() {
        if (window.nodeRequire) {
            const { remote } = window.nodeRequire('electron');
            const res = await remote.dialog.showOpenDialog({ 
                properties: ['openDirectory'] 
            });
            return res.canceled ? null : res.filePaths[0];
        } else {
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

    async escanearPasta(pathAlvo) {
        console.log('🔍 Scanner.escanearPasta chamado:', pathAlvo);
        
        this.docCount = 0;
        this.totalSize = 0;
        
        try {
            if (pathAlvo.startsWith('content://')) {
                console.log('📱 Android - chamando walkAndroid');
                await this.walkAndroid(pathAlvo);
            } else {
                console.log('💻 Desktop - chamando walkDesktop');
                await this.walkDesktop(pathAlvo);
            }
            
            console.log('✅ Escaneamento completo:', {
                arquivos: this.docCount,
                tamanho: this.totalSize
            });
            
            return true;
        } catch (e) {
            console.error('❌ Erro em escanearPasta:', e.name, '-', e.message);
            console.error('❌ Stack:', e.stack);
            return false;
        }
    },


async walkAndroid(pathAlvo) {
    console.log('\n=== walkAndroid (SAF Android 14) ===');
    console.log('pathAlvo:', pathAlvo);
    
    // Usa SAF plugin para content:// URIs
    if (pathAlvo.startsWith('content://') && typeof AndroidSAFScanner !== 'undefined') {
        console.log('📱 Usando SAF plugin...');
        return await this.walkAndroidSAF(pathAlvo);
    }
    
    // Fallback para file://
    let fileURI;
    
    if (pathAlvo.startsWith('content://')) {
        const decoded = decodeURIComponent(pathAlvo);
        const match = decoded.match(/primary:(.*)/i);
        if (match) {
            const relativePath = match[1].replace(/:/g, '/');
            fileURI = 'file:///storage/emulated/0/' + relativePath;
        } else {
            console.error('❌ Não consegue extrair caminho');
            return;
        }
    } else if (pathAlvo.startsWith('file://')) {
        fileURI = pathAlvo;
    } else {
        fileURI = 'file:///storage/emulated/0' + (pathAlvo.startsWith('/') ? pathAlvo : '/' + pathAlvo);
    }
    
    console.log('fileURI:', fileURI);
    
    return new Promise((resolve) => {
        window.resolveLocalFileSystemURL(fileURI, async (dirEntry) => {
            console.log('✅ Pasta:', dirEntry.name);
            
            const reader = dirEntry.createReader();
            const entries = [];
            const readAll = () => {
                reader.readEntries((batch) => {
                    if (batch.length > 0) {
                        entries.push(...batch);
                        readAll();
                    } else {
                        processEntries(entries);
                    }
                }, () => processEntries(entries));
            };
            readAll();
            
            const processEntries = async (entries) => {
                console.log('📋 Total:', entries.length);
                
                for (let entry of entries) {
                    console.log('→', entry.isDirectory ? '📁' : '📄', entry.name);
                    
                    if (entry.isDirectory && !entry.name.startsWith('.')) {
                        await this.walkAndroid(entry.nativeURL);
                    } else if (entry.isFile && entry.name.toLowerCase().endsWith('.pdf')) {
                        this.docCount++;
                        const partes = entry.fullPath.split('/');
                        const nomeDaPasta = partes[partes.length - 2] || "Raiz";
                        
                        const musica = {
                            _id: entry.fullPath,
                            nome: entry.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
                            pasta: nomeDaPasta,
                            path: entry.fullPath,
                            tipo: 'musica'
                        };
                        
                        await this.processarAnexoAndroid(entry, musica);
                    }
                }
                
                console.log('📊 PDFs nesta pasta:', this.docCount, '\n');
                resolve();
            };
        }, (err) => {
            console.error('❌ resolveFileSystemURL:', err.code);
            resolve();
        });
    });
},

async walkAndroidSAF(contentUri) {
    console.log('🔧 SAF Scanner:', contentUri);
    
    return new Promise((resolve) => {
        AndroidSAFScanner.scanDirectory(
            contentUri,
            async (result) => {
                console.log('📊 SAF Result:', result);
                
                try {
                    const data = typeof result === 'string' ? JSON.parse(result) : result;
                    
                    if (data.files && data.files.length > 0) {
                        console.log('📄 PDFs encontrados:', data.files.length);
                        
                        for (let file of data.files) {
                            console.log('✅ PDF:', file.nome || file.name, '| Pasta:', file.pasta);
                            this.docCount++;
                            this.totalSize += file.size || 0;
                            this.updateProgress();
                            
                            // Ler e salvar PDF
                            AndroidSAFScanner.readPdfBlob(
                                file.path,
                                async (pdfData) => {
                                    const pdfBase64 = typeof pdfData === 'string' ? 
                                        JSON.parse(pdfData).base64 : pdfData.base64;
                                    
                                    const musica = {
                                        _id: file.path,
                                        nome: file.nome || file.name,
                                        pasta: file.pasta || "Raiz",
                                        path: file.path,
                                        tipo: 'musica',
                                        _attachments: {
                                            'partitura.pdf': {
                                                content_type: 'application/pdf',
                                                data: pdfBase64
                                            }
                                        }
                                    };
                                    
                                    await window.DBManager.inserirMusica(musica);
                                    console.log('✅ PDF salvo:', musica.nome);
                                },
                                (err) => console.error('❌ Erro ler PDF:', err)
                            );
                        }
                    }
                    
                    console.log('📊 Total PDFs:', this.docCount);
                    this.updateProgress();
                    resolve();
                    
                } catch (e) {
                    console.error('❌ Erro SAF:', e);
                    resolve();
                }
            },
            (err) => {
                console.error('❌ SAF Error:', err);
                resolve();
            }
        );
    });
},
    async processarAnexoAndroid(fileEntry, musicaDoc) {
        return new Promise((resolve) => {
            fileEntry.file(file => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const blob = new Blob([reader.result], { type: 'application/pdf' });
                    
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