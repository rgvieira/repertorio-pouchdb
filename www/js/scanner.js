/**
 * scanner.js - Versão RASTREÁVEL (Logs em tempo real)
 */
const Scanner = {
    sistemaPronto: false,

    async esperarProntidao() {
        console.log("DEBUG: Iniciando esperarProntidao...");
        return new Promise((resolve) => {
            if (window.electronAPI) {
                console.log("DEBUG: Ambiente Electron detectado.");
                this.sistemaPronto = true;
                return resolve();
            }

            let tentativas = 0;
const checar = () => {
    tentativas++;
    console.log(`DEBUG: Tentativa ${tentativas} de encontrar plugins...`);
    
    // Procura o plugin de permissões em múltiplos locais possíveis
    const permissions = window.plugins?.permissions || window.cordova?.plugins?.permissions;
    
    // Procura o FilePicker (ele pode estar no window ou dentro de plugins)
    const hasPicker = !!(window.FilePicker || window.plugins?.filePicker || window.cordova?.plugins?.filePicker);

    if (permissions && hasPicker) {
        console.log("DEBUG: Plugins Permissions e Picker detectados!");
        this.sistemaPronto = true;
        resolve();
    } else if (tentativas > 30) { // Aumentei para 30 tentativas (6 segundos)
        console.error("DEBUG: Timeout! Plugins essenciais não encontrados.");
        resolve(); 
    } else {
        setTimeout(checar, 200);
    }
};
            checar();
        });
    },
async garantirPermissoes() {
    // Se estiver no Android, o plugin de permissões seria ideal, 
    // mas se ele não carregar, o Seletor HTML5 assume a responsabilidade.
    const permissions = window.plugins?.permissions || window.cordova?.plugins?.permissions;
    
    if (window.cordova && permissions) {
        console.log("DEBUG: Usando plugin de permissões Cordova.");
        // Sua lógica de permissões atual aqui...
        return true; 
    }
    
    console.log("DEBUG: Pulando permissões (Nativo/Desktop).");
    return true;
},

async abrirPicker() {
    console.log("DEBUG: Iniciando Picker de PASTA (SelectMode: folder)...");

    // 1. ESTRATÉGIA DESKTOP (ELECTRON)
    if (window.nodeRequire) {
        const { remote } = window.nodeRequire('electron');
        const dialog = remote ? remote.dialog : null;
        if (dialog) {
            const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
            return result.canceled ? null : result.filePaths[0];
        }
    }

    // 2. ESTRATÉGIA ANDROID (FILEBROWSER COM SELECTMODE)
    return new Promise((resolve) => {
        if (window.OurCodeWorld && window.OurCodeWorld.Filebrowser) {
            
            window.OurCodeWorld.Filebrowser.open(
                function(result) {
                    if (result && result.length > 0) {
                        // O plugin costuma retornar um array com o caminho: ["/storage/emulated/0/..."]
                        const path = Array.isArray(result) ? result[0] : result;
                        console.log("DEBUG: Path escolhido:", path);
                        resolve(path);
                    } else {
                        resolve(null);
                    }
                },
                function(error) {
                    console.error("DEBUG: Erro no Picker:", error);
                    resolve(null);
                },
                {
                    selectMode: "folder" // ISSO É O QUE GARANTE A PASTA
                }
            );
        } else {
            console.error("ERROR: Plugin OurCodeWorld.Filebrowser não carregado.");
            alert("Plugin de pasta não inicializou corretamente.");
            resolve(null);
        }
    });
},


    async escanearPasta(entrada) {
        console.log("DEBUG: Iniciando escanearPasta para:", entrada);
        if (!entrada) return;

        try {
            if (window.electronAPI) {
                await walk(entrada, entrada);
            } else {
                await this.processarAndroid(entrada);
            }
            this.exibirToast("Sincronização concluída!");
        } catch (err) {
            console.error("DEBUG: Erro no escanearPasta:", err);
        }
    },

    async processarAndroid(uri) {
        const partes = uri.split('/');
        const nomeDaPasta = decodeURIComponent(partes[partes.length - 1]);
        const musica = { _id: uri, nome: "Pasta Android", pasta: nomeDaPasta, tipo: 'musica' };
        if (window.DBManager) await window.DBManager.inserirMusica(musica);
    },

    exibirToast(msg) {
        if (window.plugins && window.plugins.toast) {
            window.plugins.toast.showShortBottom(msg);
        } else {
            console.log("TOAST:", msg);
        }
    }
};

const walk = async (dir, raizEscolhida) => {
    try {
        const files = await window.electronAPI.lerDiretorio(dir);
        for (const file of files) {
            const separador = navigator.platform.includes('Win') ? '\\' : '/';
            const caminhoCompleto = dir.endsWith(separador) ? dir + file : dir + separador + file;
            const stat = await window.electronAPI.obterStatus(caminhoCompleto);
            if (stat.isDirectory) {
                if (!file.startsWith('.')) await walk(caminhoCompleto, raizEscolhida);
            } else if (stat.isFile && file.toLowerCase().endsWith('.pdf')) {
                const partes = caminhoCompleto.split(/[\\/]/);
                const nomeDaPasta = partes[partes.length - 2];
                const nomeLimpo = file.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
                const musica = { _id: caminhoCompleto, nome: nomeLimpo, pasta: nomeDaPasta, tipo: 'musica' };
                if (window.DBManager) await window.DBManager.inserirMusica(musica);
            }
        }
    } catch (err) {
        console.error("Erro walk:", err);
    }
};

window.Scanner = Scanner;