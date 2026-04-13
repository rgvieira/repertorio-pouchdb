# full_install.ps1
# Executa TODO o processo: criar plugin → instalar → buildar → instalar no device

$projectRoot = "D:\workspace\repertorio-pouchdb"
Set-Location $projectRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  INSTALL COMPLETO - FolderPicker Plugin" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Passo 1: Criar plugin
Write-Host "[1/5] Criando plugin..." -ForegroundColor Yellow
& .\create_plugin.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

# Passo 2: Adicionar wrapper
Write-Host "`n[2/5] Adicionando wrapper no app.js..." -ForegroundColor Yellow
& .\add_wrapper.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

# Passo 3: Instalar plugin
Write-Host "`n[3/5] Instalando plugin no projeto..." -ForegroundColor Yellow
& .\install_plugin.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

# Passo 4: Buildar
Write-Host "`n[4/5] Buildando APK..." -ForegroundColor Yellow
& .\build.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

# Passo 5: Instalar no device
Write-Host "`n[5/5] Instalando no dispositivo..." -ForegroundColor Yellow
& .\install_device.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  ✅ INSTALAÇÃO COMPLETA COM SUCESSO!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`Mande abrir o app e teste o botão 'Escolher Pasta'!" -ForegroundColor Yellow
Write-Host "Console do Chrome: chrome://inspect" -ForegroundColor Yellow