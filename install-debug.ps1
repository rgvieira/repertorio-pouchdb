# install-debug.ps1
Set-Location $PSScriptRoot

$apkPath = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    $debugFolder = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\apk\debug"
    if (Test-Path $debugFolder) {
        $apkPath = Get-ChildItem -Path $debugFolder -Filter "*.apk" | Select-Object -First 1 -ExpandProperty FullName
    }
}

if (-not $apkPath -or -not (Test-Path $apkPath)) {
    Write-Host "ERRO: APK debug não encontrado." -ForegroundColor Red
    Write-Host "Execute primeiro: .\build-debug.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "APK encontrado: $apkPath" -ForegroundColor Green

Write-Host ""
Write-Host "--- Verificando dispositivos Android conectados ---" -ForegroundColor Cyan
$devices = adb devices

Write-Host $devices

# Verificar se há algum dispositivo com status "device"
if ($devices -notmatch "\S+\s+device") {
    Write-Host ""
    Write-Host "ERRO: Nenhum dispositivo Android encontrado ou não está pronto." -ForegroundColor Red
    Write-Host ""
    Write-Host "Certifique-se de:" -ForegroundColor Yellow
    Write-Host "  1. Celular conectado via USB" -ForegroundColor Yellow
    Write-Host "  2. Depuração USB ativada nas Opções de Desenvolvedor" -ForegroundColor Yellow
    Write-Host "  3. Permitir depuração USB neste PC quando perguntado no celular" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "--- Instalando APK debug no dispositivo ---" -ForegroundColor Cyan
$installResult = adb install -r $apkPath

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Falha ao instalar APK debug no dispositivo." -ForegroundColor Red
    Write-Host $installResult
    exit 1
}

Write-Host ""
Write-Host "APK debug instalado com sucesso no dispositivo!" -ForegroundColor Green