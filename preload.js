const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    salvarPartitura: (dados) => ipcRenderer.send('salvar-pdf-direto', dados),
    imprimirDireto: (dados) => ipcRenderer.send('chamar-impressora', dados),
    // NOVAS FUNÇÕES PARA O SCANNER
    lerDiretorio: (caminho) => ipcRenderer.invoke('ler-diretorio', caminho),
    obterStatus: (caminho) => ipcRenderer.invoke('obter-status', caminho),
    abrirDialogoPasta: () => ipcRenderer.invoke('abrir-dialogo-pasta'),
    abrirLink: (url) => ipcRenderer.send('abrir-link-externo', url)
});