/**
 * www/js/scanner.js - Versão Electron Segura
 */
const Scanner = {
    // Agora usa o diálogo nativo do Electron (não usa mais o input hack)
    async abrirPicker() {
        if (window.electronAPI && window.electronAPI.abrirDialogoPasta) {
            // Chama a ponte que criamos no main.js
            return await window.electronAPI.abrirDialogoPasta();
        }
        console.error("Ponte electronAPI não encontrada!");
        return null;
    },

    // Inicia o processo de varredura
    async escanearPasta(diretorioAlvo) {
        if (!diretorioAlvo) return;
        try {
            console.log("Scanner iniciado para:", diretorioAlvo);
            // Chama a função recursiva walk
            await walk(diretorioAlvo, diretorioAlvo);
            if (window.showToast) window.showToast("Sincronização concluída!", "success");
        } catch (err) {
            console.error("Erro no Scanner:", err);
        }
    }
};

// Função recursiva para varrer as pastas usando a Ponte IPC
const walk = async (dir, raizEscolhida) => {
    // Solicita a lista de arquivos ao Processo Principal (main.js)
    const files = await window.electronAPI.lerDiretorio(dir);

    for (const file of files) {
        // Monta o caminho de forma simples
        const separador = navigator.platform.includes('Win') ? '\\' : '/';
        const caminhoCompleto = dir.endsWith(separador) ? dir + file : dir + separador + file;
        
        // Solicita o status (pasta ou arquivo) ao main.js
        const stat = await window.electronAPI.obterStatus(caminhoCompleto);

        if (stat.isDirectory) {
            // Se for pasta e não for oculta, entra nela
            if (!file.startsWith('.')) {
                await walk(caminhoCompleto, raizEscolhida);
            }
        } else if (stat.isFile && file.toLowerCase().endsWith('.pdf')) {
            // Lógica para extrair nome da pasta e da música
            const partes = caminhoCompleto.split(/[\\/]/);
            const nomeDaPasta = partes[partes.length - 2];
            const nomeLimpo = file.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');

            const musica = {
                _id: caminhoCompleto,
                nome: nomeLimpo,
                pasta: nomeDaPasta,
                tipo: 'musica'
            };

  
            // Envia para o seu DBManager (PouchDB)
            if (window.DBManager) {
                await window.DBManager.inserirMusica(musica);
            }
        }
    }
};

// Exporta para o escopo global da janela
window.Scanner = Scanner;