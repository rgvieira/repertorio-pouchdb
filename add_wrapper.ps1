# add_wrapper.ps1
# Adiciona o wrapper manual do FolderPicker no início do app.js

$projectRoot = "D:\workspace\repertorio-pouchdb"
$appJsPath = "$projectRoot\www\js\app.js"

Write-Host "=== Adicionando Wrapper do FolderPicker no app.js ===" -ForegroundColor Cyan

if (-not (Test-Path $appJsPath)) {
    Write-Host "❌ ERRO: Arquivo app.js não encontrado em $appJsPath" -ForegroundColor Red
    exit 1
}

# Lê o conteúdo atual
$content = Get-Content $appJsPath -Raw -Encoding UTF8

# Wrapper a ser inserido
$wrapper = @'

// ================================
// FORÇA REGISTRO DO FOLDERPICKER (CORREÇÃO CORDOVA 12)
// ================================
(function() {
    if (!window.cordova) {
        console.warn('⚠️ Cordova não carregado ainda');
        return;
    }
    
    if (!cordova.plugins) {
        cordova.plugins = {};
    }
    
    // Se já existe, pula
    if (cordova.plugins.FolderPicker) {
        console.log('✅ FolderPicker já está registrado');
        return;
    }
    
    // CRIA manual que chama cordova.exec direto
    cordova.plugins.FolderPicker = {
        openFolderPicker: function(successCallback, errorCallback) {
            console.log('📂 Chamando FolderPicker.openFolderPicker...');
            cordova.exec(
                function(uri) {
                    console.log('✅ FolderPicker retornou:', uri);
                    if (successCallback) successCallback(uri);
                },
                function(err) {
                    console.error('❌ FolderPicker erro:', err);
                    if (errorCallback) errorCallback(err);
                },
                'FolderPicker',
                'openFolderPicker',
                []
            );
        }
    };
    
    console.log('✅ FolderPicker forçado manualmente em cordova.plugins.FolderPicker');
})();

'@

# Insere o wrapper logo após a primeira linha (após console.log("ConfigApp: Iniciando..."))
$lines = $content -split "`n"
$firstLine = $lines[0]
$rest = $lines[1..($lines.Length - 1)] -join "`n"

$newContent = "$firstLine`n$wrapper`n$rest"

# Salva o arquivo
$newContent | Out-File -FilePath $appJsPath -Encoding UTF8 -NoNewline

Write-Host "✅ Wrapper adicionado com sucesso em app.js" -ForegroundColor Green