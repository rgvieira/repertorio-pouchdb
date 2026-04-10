/**
 * Scanner de arquivos usando cordova-plugin-file
 */
const Scanner = {
    async abrirPicker() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;

            input.onchange = async (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const isElectron = (typeof process !== 'undefined' && !!(process.versions && process.versions.electron));

                    if (isElectron) {
                        const filePath = file.path;
                        // dirname manual para não quebrar o JS
                        const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
                        const absolutePath = filePath.substring(0, lastSlash);
                        resolve(absolutePath);
                    } else {
                        alert("No navegador, use a entrada manual para definir o caminho.");
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            };
            input.click();
        });
    },

    async escanearPasta(caminho) {
        const isElectron = (typeof process !== 'undefined' && !!(process.versions && process.versions.electron));
        if (!isElectron) return;

        console.log("Iniciando escaneamento em:", caminho);
        try {
            const fs = window.require('fs');
            const path = window.require('path');
            
            // MANTENHA AQUI SUA LÓGICA ORIGINAL DE FS (readdir, etc)
            // Se você já tinha código aqui, não o apague.
        } catch (e) {
            console.error("Erro ao carregar FS:", e);
        }
    }
};

// Expor globalmente para ser chamado pela UI
window.Scanner = Scanner;
