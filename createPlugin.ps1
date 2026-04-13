# create_plugin.ps1
# Cria o plugin FolderPicker completo na estrutura correta

$projectRoot = "D:\workspace\repertorio-pouchdb"
$pluginPath = "$projectRoot\plugins\cordova-plugin-folder-picker"

Write-Host "=== Criando Plugin FolderPicker ===" -ForegroundColor Cyan

# Cria estrutura de pastas
Write-Host "Criando estrutura de pastas..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$pluginPath" -Force | Out-Null
New-Item -ItemType Directory -Path "$pluginPath\www" -Force | Out-Null
New-Item -ItemType Directory -Path "$pluginPath\src\android" -Force | Out-Null

# Cria plugin.xml
Write-Host "Criando plugin.xml..." -ForegroundColor Yellow
@"
<?xml version="1.0" encoding="UTF-8"?>
<plugin xmlns="http://apache.org/cordova/ns/plugins/1.0"
        id="cordova-plugin-folder-picker"
        version="1.0.0">
    
    <name>FolderPicker</name>
    <description>Folder Picker via SAF (Storage Access Framework) para Android</description>
    <license>MIT</license>
    <author>Roberto</author>
    
    <js-module src="www/folderpicker.js" name="folderpicker">
        <clobbers target="cordova.plugins.FolderPicker"/>
    </js-module>
    
    <platform name="android">
        <config-file parent="/*" target="config.xml">
            <feature name="FolderPicker">
                <param name="android-package" value="br.seuapp.plugins.FolderPickerPlugin"/>
            </feature>
        </config-file>
        
        <source-file src="src/android/FolderPickerPlugin.java" 
                     target-dir="src/br/seuapp/plugins"/>
    </platform>
</plugin>
"@ | Out-File -FilePath "$pluginPath\plugin.xml" -Encoding UTF8

# Cria folderpicker.js
Write-Host "Criando folderpicker.js..." -ForegroundColor Yellow
@"
var exec = require('cordova/exec');

var FILENAME = 'FolderPicker';

var FolderPicker = {
    openFolderPicker: function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, FILENAME, 'openFolderPicker', []);
    }
};

module.exports = FolderPicker;
"@ | Out-File -FilePath "$pluginPath\www\folderpicker.js" -Encoding UTF8

# Cria FolderPickerPlugin.java
Write-Host "Criando FolderPickerPlugin.java..." -ForegroundColor Yellow
@"
package br.seuapp.plugins;

import android.content.Intent;
import android.net.Uri;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;

public class FolderPickerPlugin extends CordovaPlugin {

    private static final int REQUEST_CODE_FOLDER_PICKER = 1001;
    private CallbackContext callbackContext;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        this.callbackContext = callbackContext;

        if ("openFolderPicker".equals(action)) {
            openFolderPicker();
            return true;
        }

        return false;
    }

    private void openFolderPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );

        try {
            cordova.startActivityForResult(this, intent, REQUEST_CODE_FOLDER_PICKER);
        } catch (Exception e) {
            callbackContext.error("Nao e possivel abrir o seletor de pasta: " + e.getMessage());
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == REQUEST_CODE_FOLDER_PICKER) {
            if (resultCode == cordova.getActivity().RESULT_OK && intent != null) {
                Uri treeUri = intent.getData();
                
                if (treeUri != null) {
                    cordova.getActivity().getContentResolver()
                        .takePersistableUriPermission(
                            treeUri,
                            Intent.FLAG_GRANT_READ_URI_PERMISSION |
                            Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        );
                    
                    PluginResult result = new PluginResult(
                        PluginResult.Status.OK,
                        treeUri.toString()
                    );
                    result.setKeepCallback(false);
                    callbackContext.sendPluginResult(result);
                } else {
                    callbackContext.error("URI da pasta e nulo");
                }
            } else {
                callbackContext.error("Usuario cancelou ou erro ao escolher pasta");
            }
        }
    }
}
"@ | Out-File -FilePath "$pluginPath\src\android\FolderPickerPlugin.java" -Encoding UTF8

Write-Host "✅ Plugin criado com sucesso!" -ForegroundColor Green
Write-Host "   Local: $pluginPath" -ForegroundColor Gray