# install_plugin_simples.ps1
# Instala plugin JÁ EXISTENTE, builda e envia para Android

$projectRoot = "D:\workspace\repertorio-pouchdb"
$pluginPath = "$projectRoot\cordova-plugin-folder-picker"

Set-Location $projectRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  INSTALAR PLUGIN JÁ EXISTENTE" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Verifica se plugin existe
if (-not (Test-Path $pluginPath)) {
    Write-Host "❌ ERRO: Plugin não encontrado em $pluginPath" -ForegroundColor Red
    Write-Host "   Localizado o plugin?" -ForegroundColor Yellow
    exit 1
}

Write-Host "Plugin encontrado: $pluginPath" -ForegroundColor Green

# 1. Remove plugin antigo
Write-Host "`n[1/5] Removendo plugin antigo..." -ForegroundColor Yellow
cordova plugin rm cordova-plugin-folder-picker --force 2>$null

# 2. Instala o plugin COM --link (não move a pasta!)
Write-Host "[2/5] Instalando plugin..." -ForegroundColor Yellow
cordova plugin add "$pluginPath" --link

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO: Falha ao instalar plugin" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Plugin instalado!" -ForegroundColor Green

# 3. Adiciona wrapper no app.js
Write-Host "`n[3/5] Adicionando wrapper no app.js..." -ForegroundColor Yellow

$appJsPath = "$projectRoot\www\js\app.js"
if (Test-Path $appJsPath) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $content = [System.IO.File]::ReadAllText($appJsPath, $utf8NoBom)
    
    # Verifica se wrapper já existe
    if ($content -match "FORÇA REGISTRO DO FOLDERPICKER") {
        Write-Host "✅ Wrapper já existe no app.js" -ForegroundColor Green
    } else {
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
        
        [System.IO.File]::WriteAllText($appJsPath, $newContent, $utf8NoBom)
        Write-Host "✅ Wrapper adicionado em app.js" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ app.js não encontrado" -ForegroundColor Yellow
}

# 4. Buildar
Write-Host "`n[4/5] Buildando APK..." -ForegroundColor Yellow

cordova prepare android
cordova clean
cordova build android --debug

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO: Falha no build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ APK buildado!" -ForegroundColor Green

# 5. Instalar no device
Write-Host "`n[5/5] Instalando no dispositivo..." -ForegroundColor Yellow

$apkPath = "$projectRoot\platforms\android\app\build\outputs\apk\debug\app-debug.apk"

# Verifica dispositivo
$devices = adb devices
if (-not ($devices | Select-String -Pattern "device\r?$")) {
    Write-Host "❌ ERRO: Nenhum dispositivo Android conectado" -ForegroundColor Red
    Write-Host "   Conecte com USB debugging ativado" -ForegroundColor Yellow
    exit 1
}

# Desinstala app antigo
Write-Host "Desinstalando app antigo..." -ForegroundColor Gray
adb uninstall com.seuprojeto.repertorio 2>$null

# Instala APK novo
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