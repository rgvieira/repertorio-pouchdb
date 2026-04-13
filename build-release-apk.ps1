# build.ps1
# Builda o APK debug do projeto Cordova

$projectRoot = "D:\workspace\repertorio-pouchdb"
Set-Location $projectRoot

Write-Host "=== Buildando Projeto Cordova ===" -ForegroundColor Cyan

# Limpa build anterior
Write-Host "Limpan clean..." -ForegroundColor Yellow
cordova clean

# Prepara o projeto
Write-Host "Preparando projeto..." -ForegroundColor Yellow
cordova prepare android

# Builda o APK
Write-Host "Buildando APK debug..." -ForegroundColor Yellow
cordova build android --debug

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO: Falha no build" -ForegroundColor Red
    exit 1
}

# Mostra caminho do APK
$apkPath = "$projectRoot\platforms\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "`n✅ APK buildado com sucesso!" -ForegroundColor Green
    Write-Host "   Localização: $apkPath" -ForegroundColor Gray
} else {
    Write-Host "❌ ERRO: APK não encontrado após build" -ForegroundColor Red
    exit 1
}