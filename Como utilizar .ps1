Vou gerar 4 scripts PowerShell separados, um para cada tarefa:

1. `build-debug.ps1` – gera APK debug assinado
2. `install-debug.ps1` – instala APK debug no dispositivo via USB
3. `build-release-apk.ps1` – gera APK release assinado
4. `build-release-aab.ps1` – gera AAB release assinado (para Google Play)

Todos devem ficar na raiz do projeto:

```text
D:\workspace\repertorio-pouchdb\
  build-debug.ps1
  install-debug.ps1
  build-release-apk.ps1
  build-release-aab.ps1
```

***

## 1. `build-debug.ps1` – gerar APK debug assinado

```powershell
# build-debug.ps1
# Gera APK debug assinado do projeto Cordova Android
# Uso: npx pwsh -ExecutionPolicy Bypass -File build-debug.ps1
#      ou, se PowerShell já estiver no PATH: .\build-debug.ps1

Set-Location $PSScriptRoot

Write-Host "--- Limpando projeto ---" -ForegroundColor Cyan
npx cordova clean

Write-Host ""
Write-Host "--- Gerando APK debug assinado ---" -ForegroundColor Cyan
npx cordova build android --debug --buildConfig=build.json

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Falha ao gerar APK debug." -ForegroundColor Red
    Write-Host "Verifique o output acima para detalhes." -ForegroundColor Red
    exit 1
}

$apkPath = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\apk\debug\app-debug.apk"

if (Test-Path $apkPath) {
    Write-Host ""
    Write-Host "APK debug gerado com sucesso!" -ForegroundColor Green
    Write-Host "Caminho: $apkPath" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "AVISO: APK debug não encontrado no caminho esperado." -ForegroundColor Yellow
    Write-Host "Procure em: platforms\android\app\build\outputs\apk\debug\" -ForegroundColor Yellow
}
```

***

## 2. `install-debug.ps1` – instalar APK debug no dispositivo via USB

```powershell
# install-debug.ps1
# Instala o APK debug no dispositivo Android conectado via USB
# Uso: npx pwsh -ExecutionPolicy Bypass -File install-debug.ps1
#      ou, se PowerShell já estiver no PATH: .\install-debug.ps1

Set-Location $PSScriptRoot

$apkPath = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    Write-Host "ERRO: APK debug não encontrado." -ForegroundColor Red
    Write-Host "Caminho esperado: $apkPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Primeiro gere o APK debug com: .\build-debug.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "--- Verificando dispositivos Android conectados ---" -ForegroundColor Cyan
$devices = adb devices

Write-Host $devices

if ($devices -notmatch 'device\s*$') {
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
```

***

## 3. `build-release-apk.ps1` – gerar APK release assinado

```powershell
# build-release-apk.ps1
# Gera APK release assinado do projeto Cordova Android
# Uso: npx pwsh -ExecutionPolicy Bypass -File build-release-apk.ps1
#      ou, se PowerShell já estiver no PATH: .\build-release-apk.ps1

Set-Location $PSScriptRoot

Write-Host "--- Limpando projeto ---" -ForegroundColor Cyan
npx cordova clean

Write-Host ""
Write-Host "--- Gerando APK release assinado ---" -ForegroundColor Cyan
npx cordova build android --release --buildConfig=build.json

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Falha ao gerar APK release." -ForegroundColor Red
    Write-Host "Verifique o output acima para detalhes." -ForegroundColor Red
    exit 1
}

$apkPath = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\apk\release\app-release.apk"

if (Test-Path $apkPath) {
    Write-Host ""
    Write-Host "APK release gerado com sucesso!" -ForegroundColor Green
    Write-Host "Caminho: $apkPath" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "AVISO: APK release não encontrado no caminho esperado." -ForegroundColor Yellow
    Write-Host "Procure em: platforms\android\app\build\outputs\apk\release\" -ForegroundColor Yellow
}
```

***

## 4. `build-release-aab.ps1` – gerar AAB release assinado (para Google Play)

```powershell
# build-release-aab.ps1
# Gera AAB (Android App Bundle) release assinado para Google Play
# Uso: npx pwsh -ExecutionPolicy Bypass -File build-release-aab.ps1
#      ou, se PowerShell já estiver no PATH: .\build-release-aab.ps1

Set-Location $PSScriptRoot

Write-Host "--- Limpando projeto ---" -ForegroundColor Cyan
npx cordova clean

Write-Host ""
Write-Host "--- Gerando AAB release assinado ---" -ForegroundColor Cyan
npx cordova build android --release --bundle --buildConfig=build.json

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Falha ao gerar AAB release." -ForegroundColor Red
    Write-Host "Verifique o output acima para detalhes." -ForegroundColor Red
    exit 1
}

$aabPath = Join-Path $PSScriptRoot "platforms\android\app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $aabPath) {
    Write-Host ""
    Write-Host "AAB release gerado com sucesso!" -ForegroundColor Green
    Write-Host "Caminho: $aabPath" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "AVISO: AAB release não encontrado no caminho esperado." -ForegroundColor Yellow
    Write-Host "Procure em: platforms\android\app\build\outputs\bundle\release\" -ForegroundColor Yellow
}
```

***

## Como usar os scripts

Na raiz do projeto (`D:\workspace\repertorio-pouchdb`):

1. **Gerar APK debug assinado:**

   ```powershell
   .\build-debug.ps1
   ```

2. **Instalar APK debug no dispositivo via USB:**

   ```powershell
   .\install-debug.ps1
   ```

3. **Gerar APK release assinado:**

   ```powershell
   .\build-release-apk.ps1
   ```

4. **Gerar AAB release assinado (Google Play):**

   ```powershell
   .\build-release-aab.ps1
   ```

Se tiver problema de política de execução no PowerShell, use:

```powershell
npx pwsh -ExecutionPolicy Bypass -File build-debug.ps1
npx pwsh -ExecutionPolicy Bypass -File install-debug.ps1
npx pwsh -ExecutionPolicy Bypass -File build-release-apk.ps1
npx pwsh -ExecutionPolicy Bypass -File build-release-aab.ps1
```

Se quiser, posso também gerar um script único `build-all.ps1` que roda todos em sequência (debug → install → release apk → release aab).