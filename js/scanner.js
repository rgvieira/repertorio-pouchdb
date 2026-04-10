/**
 * Scanner de arquivos usando cordova-plugin-file
 */
const Scanner = {
    extensoes: ['.pdf', '.mscz', '.mxl', '.txt'],

    async escanearPasta(path) {
        console.log("Iniciando escaneamento recursivo em:", path);

        if (!path) {
            console.error("Caminho não fornecido para o scanner.");
            return;
        }

        // Detecta se está rodando no Electron de forma mais robusta
        const isElectron = (typeof window.require === 'function' && typeof window.process === 'object' && typeof window.process.type === 'string');
        console.log("isElectron detected:", isElectron);

        if (isElectron) {
            console.log("Using Electron's Node.js fs module for scanning. " +path);
            return this.scanElectron(path);
        }

        // Fallback para Cordova Mobile
        if (typeof window.resolveLocalFileSystemURL === 'function') {
            return new Promise((resolve, reject) => {
                window.resolveLocalFileSystemURL(path, (dirEntry) => {
                    console.log("Using Cordova mobile file API for scanning.");
                    this.traverseDirectory(dirEntry, 0, "", "").then(resolve);
                }, reject);
            });
        } else {
            const msg = "Erro: API de sistema de arquivos não encontrada. O escaneamento de pastas locais via caminho (string) só funciona em ambiente nativo (Android/iOS) ou Electron.";
            console.error(msg);
            throw new Error(msg);
        }
    }, // Vírgula obrigatória entre métodos de objeto

    /**
     * Abre o seletor de pastas nativo (via hack do Electron)
     * Retorna o caminho absoluto da pasta selecionada
     */
    async abrirPicker() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;

input.onchange = async (e) => {
    if (e.target.files.length > 0) {
        // 1. Detecta o ambiente sem frescura
        const isElectron = (typeof process !== 'undefined' && !!(process.versions && process.versions.electron));
        const file = e.target.files[0];

        // --- SE FOR NAVEGADOR (WEB/CELULAR) ---
        if (!isElectron) {
            console.warn("Modo Web: Bloqueando acesso ao FS.");
            alert("⚠️ O scanner só funciona no Desktop. No celular, use o botão de Adicionar Manual.");
            resolve(null);
            return;
        }

        // --- SE FOR DESKTOP (ELECTRON) ---
        try {
            const filePath = file.path; // No Electron isso funciona
            
            if (!filePath) {
                resolve(null);
                return;
            }

            // A MÁGICA SEM DIRNAME:
            // Pegamos a posição da última barra (seja / ou \)
            const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
            
            // Cortamos a string até a última barra. Isso É o dirname.
            const absolutePath = filePath.substring(0, lastSlash);

            console.log("Caminho extraído (JS Puro):", absolutePath);
            resolve(absolutePath);

        } catch (err) {
            console.error("Erro ao processar:", err);
            resolve(null);
        }
    } else {
        resolve(null);
    }
};
            
            input.click();
        });
    },

    /**
     * Escaneamento nativo para Electron usando Node.js fs
     */
/**
     * Escaneamento nativo para Electron usando Node.js fs
     */
async scanElectron(rootPath) {
        const fs = window.require('fs');
        const path = window.require('path');

        // Limpa aspas e espaços
        let cleanPath = rootPath.trim().replace(/^["']|["']$/g, '');
        // Normaliza para d:\repertorio\infantil (sem barra no final)
        cleanPath = path.normalize(cleanPath).replace(/[\\/]+$/, '');

        console.log(`[PERMISSÃO CONCEDIDA] Escaneando: ${cleanPath}`);

        const walk = async (currentPath, depth, genero, artista) => {
            try {
                // Se o main.js estiver certo, isso aqui NÃO dará mais ENOENT
                const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const systemPath = path.join(currentPath, entry.name);
                    // Caminho formatado para o banco de dados (usando /)
                    const webPath = systemPath.split(path.sep).join('/');

                    if (entry.isDirectory()) {
                        let nextGenero = (depth === 0) ? entry.name : genero;
                        let nextArtista = (depth === 1) ? entry.name : artista;
                        await walk(systemPath, depth + 1, nextGenero, nextArtista);
                    } 
                    else if (this.isMusicFile(entry.name)) {
                        await DBManager.inserirMusica({
                            genero: genero || "Geral",
                            artista: artista || "Desconhecido",
                            titulo: entry.name.replace(/\.[^/.]+$/, ""),
                            caminho: webPath
                        });
                    }
                }
            } catch (err) {
                console.error(`[ERRO NO DISCO] ${err.code} em: ${currentPath}`);
            }
        };

        await walk(cleanPath, 0, "", "");
        alert("Escaneamento finalizado!");
    },

    /**
     * Caminha recursivamente pelas pastas
     * @param {DirectoryEntry} dirEntry - Entrada do diretório atual
     * @param {Number} depth - Profundidade atual (0=Raiz, 1=Gênero, 2=Artista)
     * @param {String} genero - Nome do gênero detectado
     * @param {String} artista - Nome do artista detectado
     */
    async traverseDirectory(dirEntry, depth, genero, artista) {
        const reader = dirEntry.createReader();
        const entries = await new Promise((res, rej) => reader.readEntries(res, rej));
        
        for (const entry of entries) {
            if (entry.isDirectory) {
                // Define Gênero e Artista baseado na profundidade das pastas
                let nextGenero = genero;
                let nextArtista = artista;

                if (depth === 0) nextGenero = entry.name;
                else if (depth === 1) nextArtista = entry.name;

                await this.traverseDirectory(entry, depth + 1, nextGenero, nextArtista);
            } else if (entry.isFile && this.isMusicFile(entry.name)) {
                await DBManager.inserirMusica({
                    genero: genero || "Geral",
                    artista: artista || "Desconhecido",
                    titulo: entry.name.replace(/\.[^/.]+$/, ""),
                    caminho: entry.nativeURL // No Android/Windows Cordova, nativeURL é o FullPath do SO
                });
            }
        }
    },

    isMusicFile(name) {
        return this.extensoes.some(ext => name.toLowerCase().endsWith(ext));
    }
};

// Expor globalmente para ser chamado pela UI
window.Scanner = Scanner;
