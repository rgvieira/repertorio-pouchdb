const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expõe ferramentas para o Scanner/PouchDB
window.fs = fs;
window.path = path;

// Criamos o objeto que o Cordova quer
const cordovaIpc = {
    exec: (success, error, serviceName, action, args) => {
        ipcRenderer.invoke('cdv-plugin-exec', serviceName, action, args)
            .then(success)
            .catch(error);
    },
    hasService: (serviceName) => {
        return true; 
    }
};

// BLINDAGEM: Define o objeto como 'read-only' para o cordova.js não conseguir apagar
Object.defineProperty(window, '_cdvElectronIpc', {
    value: cordovaIpc,
    writable: false,
    configurable: false
});

console.log("Preload: Ponte IPC blindada e pronta.");