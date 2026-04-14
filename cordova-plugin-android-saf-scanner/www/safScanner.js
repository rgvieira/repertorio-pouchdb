var exec = require('cordova/exec');

var SAFScanner = {
    scanDirectory: function(contentUri, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'SAFScanner', 'scanDirectory', [contentUri]);
    },
    listFiles: function(contentUri, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'SAFScanner', 'listFiles', [contentUri]);
    },
    readPdfBlob: function(contentUri, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'SAFScanner', 'readPdfBlob', [contentUri]);
    }
};

module.exports = SAFScanner;
if (typeof window !== 'undefined') {
    window.AndroidSAFScanner = SAFScanner;
}