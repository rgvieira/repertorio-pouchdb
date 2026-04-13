# clean.ps1
# Limpa build e plataforma Android

$projectRoot = "D:\workspace\repertorio-pouchdb"
Set-Location $projectRoot

Write-Host "=== Limpando Projeto ===" -ForegroundColor Cyan

Write-Host "Removendo plataforma Android..." -ForegroundColor Yellow
cordova platform rm android 2>$null

Write-Host "Removendo plugins..." -ForegroundColor Yellow
cordova plugin rm cordova-plugin-folder-picker 2>$null

Write-Host "Limpan clean..." -ForegroundColor Yellow
cordova clean

Write-Host "`n✅ Projeto limpo!" -ForegroundColor Green
Write-Host "Execute: .\full_install.ps1" -ForegroundColor Yellow