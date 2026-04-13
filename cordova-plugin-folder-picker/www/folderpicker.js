var exec = require('cordova/exec');

var FILENAME = 'FolderPicker';

var FolderPicker = {
    /**
     * Abre o seletor de pasta do Android (SAF)
     * @param {Function} successCallback - Recebe o URI da pasta (ex: "content://...")
     * @param {Function} errorCallback - Recebe a mensagem de erro
     */
    openFolderPicker: function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, FILENAME, 'openFolderPicker', []);
    }
};
