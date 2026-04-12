/**
 * js/scanner.js - Versão Definitiva
 */
const Scanner = {
    async abrirPicker() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;
            input.onchange = async (e) => {
                if (e.target.files.length > 0) {
                    const firstFile = e.target.files[0];
                    if (firstFile.path) {
                        const path = window.require('path');
                        const partes = firstFile.path.split(path.sep);
                        const nomeDaPastaSelecionada = e.target.files[0].webkitRelativePath.split('/')[0];
                        const index = partes.indexOf(nomeDaPastaSelecionada);
                        const selectedFolderPath = partes.slice(0, index + 1).join(path.sep);
                        resolve(selectedFolderPath);
                    }
                } else { resolve(null); }
            };
            input.click();
        });
    },

    async escanearPasta(diretorioAlvo) {
        if (!diretorioAlvo) return;
        const path = window.require('path');
        try {
            const raiz = path.normalize(diretorioAlvo);
            await walk(raiz, raiz);
            if (window.showToast) window.showToast("Concluído!", "success");
        } catch (err) { console.error("Erro no Scanner:", err); }
    }
};

const walk = async (dir, raizEscolhida) => {
    const fs = window.require('fs');
    const path = window.require('path');
    const dirNorm = path.normalize(dir);
    const raizNorm = path.normalize(raizEscolhida);
    const files = fs.readdirSync(dirNorm);

    for (const file of files) {
        const caminhoCompleto = path.join(dirNorm, file);
        const stat = fs.statSync(caminhoCompleto);

        if (stat.isDirectory()) {
            if (!file.startsWith('.')) {
                await walk(caminhoCompleto, raizEscolhida);
            }
        } else if (stat.isFile() && file.toLowerCase().endsWith('.pdf')) {
            // REGRA: Se está na raiz, usa o nome da pasta selecionada.
            // Se está em subpasta, usa o nome da subpasta.
            const nomeDaPasta = (dirNorm === raizNorm) 
                ? path.basename(raizNorm) 
                : path.basename(dirNorm);

            const musica = {
                _id: caminhoCompleto,
                nome: file.replace(/\.[^/.]+$/, "").replace(/_/g, ' '), 
                pasta: nomeDaPasta, 
                tipo: 'musica'
            };
            await window.DBManager.inserirMusica(musica);
        }
    }
};

window.Scanner = Scanner;