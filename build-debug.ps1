# build-debug.ps1
# Gera APK debug usando o Gradle direto
# Uso: .\build-debug.ps1

Set-Location $PSScriptRoot

$gradlew = Join-Path $PSScriptRoot "platforms\android\tools\gradlew.bat"
$androidFolder = Join-Path $PSScriptRoot "platforms\android"

Write-Host "--- Limpando projeto Gradle ---" -ForegroundColor Cyan
& $gradlew -p $androidFolder clean

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Falha ao limpar projeto Gradle." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "--- Gerando APK debug com Gradle ---" -ForegroundColor Cyan
& $gradlew -p $androidFolder assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Falha ao gerar APK debug com Gradle." -ForegroundColor Red
    exit 1
}

$apkPath = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    # Se o nome for diferente, pegar o primeiro .apk da pasta debug
    $debugFolder = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\apk\debug"
    if (Test-Path $debugFolder) {
        $apkPath = Get-ChildItem -Path $debugFolder -Filter "*.apk" | Select-Object -First 1 -ExpandProperty FullName
    }
}

if ($apkPath -and (Test-Path $apkPath)) {
    Write-Host ""
    Write-Host "APK debug gerado com sucesso!" -ForegroundColor Green
    Write-Host "Caminho: $apkPath" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "ERRO: Nenhum APK debug encontrado." -ForegroundColor Red
    exit 1
}