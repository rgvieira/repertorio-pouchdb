# criar_e_instalar_plugin.ps1
# Versão FINAL - JSON correto

$projectRoot = "D:\workspace\repertorio-pouchdb"
Set-Location $projectRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  CRIAR E INSTALAR PLUGIN FOLDERPICKER" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# PASSO 1
Write-Host "[1/7] Criando estrutura do plugin..." -ForegroundColor Yellow
$pluginPath = "$projectRoot\temp-folder-picker-plugin"

if (Test-Path $pluginPath) {
    Remove-Item -Recurse -Force $pluginPath
}

New-Item -ItemType Directory -Path "$pluginPath\www" -Force | Out-Null
New-Item -ItemType Directory -Path "$pluginPath\src\android" -Force | Out-Null

# PASSO 2 - package.json (JSON correto)
Write-Host "[2/7] Criando package.json..." -ForegroundColor Yellow

$packageJson = @'
{
  "name": "cordova-plugin-folder-picker",
  "version": "1.0.0",
  "description": "Folder Picker via SAF para Android",
  "cordova": {
    "id": "cordova-plugin-folder-picker",
    "platforms": ["android"]
  },
  "keywords": ["cordova", "folder", "picker", "android", "saf"],
  "author": "Roberto",
  "license": "MIT"
}
'@

$packageJson | Out-File -FilePath "$pluginPath\package.json" -Encoding utf8

# PASSO 3 - plugin.xml
Write-Host "[3/7] Criando plugin.xml..." -ForegroundColor Yellow

$pluginXml = @'
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
'@

$pluginXml | Out-File -FilePath "$pluginPath\plugin.xml" -Encoding utf8

# PASSO 4 - folderpicker.js
Write-Host "[4/7] Criando folderpicker.js..." -ForegroundColor Yellow

$folderpickerJs = @'
var exec = require("cordova/exec");

var FILENAME = "FolderPicker";

var FolderPicker = {
    openFolderPicker: function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, FILENAME, "openFolderPicker", []);
    }
};

module.exports = FolderPicker;
'@

$folderpickerJs | Out-File -FilePath "$pluginPath\www\folderpicker.js" -Encoding utf8

# PASSO 5 - FolderPickerPlugin.java
Write-Host "[5/7] Criando FolderPickerPlugin.java..." -ForegroundColor Yellow

$pluginJava = @'
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
'@

$pluginJava | Out-File -FilePath "$pluginPath\src\android\FolderPickerPlugin.java" -Encoding utf8

Write-Host "✅ Plugin criado em $pluginPath" -ForegroundColor Green

# PASSO 6
Write-Host "`n[6/7] Instalando plugin no projeto..." -ForegroundColor Yellow
Set-Location $projectRoot

cordova plugins list 2>$null | Select-String "cordova-plugin-folder-picker" | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Removendo versão antiga..." -ForegroundColor Gray
    cordova plugin rm cordova-plugin-folder-picker --force 2>$null
}

cordova plugin add "$pluginPath"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO: Falha ao instalar plugin" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Plugin instalado!" -ForegroundColor Green
Remove-Item -Recurse -Force $pluginPath -ErrorAction SilentlyContinue

# PASSO 6.5
Write-Host "`n[6.5/7] Adicionando wrapper no app.js..." -ForegroundColor Yellow

$appJsPath = "$projectRoot\www\js\app.js"
if (Test-Path $appJsPath) {
    $content = Get-Content $appJsPath -Raw -Encoding utf8

    $wrapper = @"

// ================================
// FORÇA REGISTRO DO FOLDERPICKER (CORREÇÃO CORDOVA 12)
// ================================
(function() {
    if (!window.cordova) return;
    if (!cordova.plugins) cordova.plugins = {};
    if (cordova.plugins.FolderPicker) return;

    cordova.plugins.FolderPicker = {
        openFolderPicker: function(success, error) {
            cordova.exec(success, error, "FolderPicker", "openFolderPicker", []);
        }
    };
    console.log("✅ FolderPicker forçado manualmente");
})();

"@

    $lines = $content -split "`n"
    $firstLine = $lines[0]
    $rest = $lines[1..($lines.Length - 1)] -join "`n"
    $newContent = "$firstLine`n$wrapper`n$rest"

    $newContent | Out-File -FilePath $appJsPath -Encoding utf8 -NoNewline
    Write-Host "✅ Wrapper adicionado em app.js" -ForegroundColor Green
}

# PASSO 7
Write-Host "`n[7/7] Buildando e instalando no device..." -ForegroundColor Yellow

cordova prepare android
cordova clean
cordova build android --debug

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO: Falha no build" -ForegroundColor Red
    exit 1
}

$apkPath = "$projectRoot\platforms\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "Desinstalando app antigo..." -ForegroundColor Gray
adb uninstall com.seuprojeto.repertorio 2>$null

Write-Host "Instalando APK novo..." -ForegroundColor Gray
$instalacao = adb install "$apkPath"

if ($instalacao -match "Success") {
    Write-Host "`n================================================" -ForegroundColor Cyan
    Write-Host "  ✅ INSTALAÇÃO COMPLETA COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "`nAbra o app e vá para Configurações." -ForegroundColor Yellow
    Write-Host "Toque em 'Vincular Nova Pasta' e teste!" -ForegroundColor Yellow
    Write-Host "`nConsole do Chrome: chrome://inspect" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ ERRO: Falha ao instalar APK" -ForegroundColor Red
    Write-Host $instalacao -ForegroundColor Red
    exit 1
}