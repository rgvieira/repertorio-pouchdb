const { contextBridge, ipcRenderer } = require('electron');

// Esta é a ponte que o Cordova PRECISA para conversar com o Windows/Linux
contextBridge.exposeInMainWorld('_cdvElectronIpc', {
    exec: (success, error, serviceName, action, args) => {
        return ipcRenderer.invoke('cdv-plugin-exec', serviceName, action, args)
            .then(success)
            .catch(error);
    }
});