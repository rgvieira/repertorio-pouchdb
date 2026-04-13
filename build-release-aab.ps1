# build-release-aab.ps1
# Gera AAB (Android App Bundle) release assinado para Google Play
# Uso: .\build-release-aab.ps1

Set-Location $PSScriptRoot

Write-Host "--- Limpando projeto ---" -ForegroundColor Cyan
npx cordova clean

Write-Host ""
Write-Host "--- Gerando AAB release ---" -ForegroundColor Cyan
npx cordova build android --release --bundle --buildConfig=build.json

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Falha ao gerar AAB release." -ForegroundColor Red
    exit 1
}

$aabPath = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\bundle\release\app-release.aab"

if (-not (Test-Path $aabPath)) {
    $bundleFolder = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\bundle\release"
    if (Test-Path $bundleFolder) {
        $aabPath = Get-ChildItem -Path $bundleFolder -Filter "*.aab" | Select-Object -First 1 -ExpandProperty FullName
    }
}

if (-not $aabPath) {
    # Procurar por qualquer AAB
    $aabPath = Get-ChildItem -Path (Join-Path $PSScriptRoot "platforms\android") -Recurse -Filter "*.aab" | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $aabPath -or -not (Test-Path $aabPath)) {
    Write-Host ""
    Write-Host "ERRO: Nenhum AAB release encontrado." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "AAB release gerado com sucesso!" -ForegroundColor Green
Write-Host "Caminho: $aabPath" -ForegroundColor Yellow