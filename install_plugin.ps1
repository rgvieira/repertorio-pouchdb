# install_plugin.ps1
# Instala o plugin FolderPicker no projeto Cordova

$projectRoot = "D:\workspace\repertorio-pouchdb"
Set-Location $projectRoot

Write-Host "=== Instalando Plugin FolderPicker ===" -ForegroundColor Cyan

# Verifica se o plugin existe
$pluginPath = "$projectRoot\plugins\cordova-plugin-folder-picker"
if (-not (Test-Path $pluginPath)) {
    Write-Host "❌ ERRO: Plugin não encontrado em $pluginPath" -ForegroundColor Red
    Write-Host "   Execute primeiro: .\create_plugin.ps1" -ForegroundColor Yellow
    exit 1
}

# Remove plugin antigo se existir
Write-Host "Removendo plugin antigo (se existir)..." -ForegroundColor Yellow
cordova plugins list | Findstr "cordova-plugin-folder-picker" | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Removendo versão antiga..." -ForegroundColor Gray
    cordova plugin rm cordova-plugin-folder-picker --force
}

# Instala o plugin
Write-Host "Instalando plugin..." -ForegroundColor Yellow
cordova plugin add "$pluginPath"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO: Falha ao instalar plugin" -ForegroundColor Red
    exit 1
}

# Verifica instalação
Write-Host "`nPlugins instalados:" -ForegroundColor Cyan
cordova plugins list | Findstr "folder-picker"

Write-Host "`n✅ Plugin instalado com sucesso!" -ForegroundColor Green
