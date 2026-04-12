/**
 * Scanner de arquivos com recursividade profunda para Electron
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
                        // Pegamos a pasta que o usuário selecionou de fato
                        // O webkitdirectory nos dá arquivos dentro da pasta, path.dirname nos dá a pasta.
                        const partes = firstFile.path.split(path.sep);
                        const nomeDaPastaSelecionada = e.target.files[0].webkitRelativePath.split('/')[0];
                        const index = partes.indexOf(nomeDaPastaSelecionada);
                        const selectedFolderPath = partes.slice(0, index + 1).join(path.sep);
                        
                        resolve(selectedFolderPath);
                    }
                } else {
                    resolve(null);
                }
            };
            input.click();
        });
    },

    async escanearPasta(diretorioAlvo) {
        const isElectron = (typeof process !== 'undefined' && !!(process.versions && process.versions.electron));
        if (!isElectron) return;

        const fs = window.require('fs');
        const path = window.require('path');

        console.log("📂 Iniciando varredura recursiva em:", diretorioAlvo);
        
        let totalArquivos = 0;

        // FUNÇÃO RECURSIVA CORE
// Dentro da função walk no scanner.js
const walk = async (dir, raizEscolhida) => {
    const files = fs.readdirSync(dir);
    const path = window.require('path');

    for (const file of files) {
        const caminhoCompleto = path.join(dir, file);
        const stat = fs.statSync(caminhoCompleto);

        if (stat.isDirectory()) {
            await walk(caminhoCompleto, raizEscolhida);
        } else if (stat.isFile() && file.toLowerCase().endsWith('.pdf')) {
            const partes = caminhoCompleto.split(path.sep);
            
            // Pega o nome da pasta imediatamente superior ao arquivo
            let nomePastaPai = partes[partes.length - 2];
            
            const musica = {
                _id: caminhoCompleto, // Caminho único como ID
                titulo: file.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
                pasta: nomePastaPai, // Antigo 'gênero', agora é a pasta direta
                tipo: 'musica'
            };

            await window.DBManager.inserirMusica(musica);
        }
    }
};

        try {
            await walk(diretorioAlvo);
            window.showToast(`Concluído! ${totalArquivos} músicas encontradas.`, "success");
        } catch (err) {
            console.error("Erro no Scanner:", err);
            window.showToast("Erro ao ler pastas.", "error");
        }
    }
};

window.Scanner = Scanner;