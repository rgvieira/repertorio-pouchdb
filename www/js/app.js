console.log("ConfigApp: Iniciando...");

document.addEventListener("deviceready", onDeviceReady, false);

async function onDeviceReady() {
    if (window.app_initialized) return;
    console.log('--- Repertório: Dispositivo Pronto ---');
    
    // ================================
    // FORÇA REGISTRO DO FOLDERPICKER AQUI (dentro de deviceready)
    // ================================
    if (!cordova.plugins) {
        cordova.plugins = {};
    }
    
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
  
}

// -------------------------
// Funções de Permissão
// -------------------------
async function solicitarPermissoes() {
    // Substitua solicitarPermissoes() por:
    // No Android 11+, SAFO (FolderPicker) não requer permissão
    // Apenas verificamos se estamos em ambiente Cordova
    if (!window.cordova) {
        console.warn("⚠️ Não está em ambiente Cordova (browser?)");
        return false;
    }
    console.log("✅ SAF disponível - permissão não necessária");
    return true; // SAF não requer permissão

    return new Promise(resolve => {
        if (!cordova.plugins || !cordova.plugins.permissions) {
            console.warn("Plugin de permissões não disponível.");
            return resolve(true);
        }
        const permissions = cordova.plugins.permissions;
        const list = [
            permissions.READ_EXTERNAL_STORAGE,
            permissions.WRITE_EXTERNAL_STORAGE
            // MANAGE_EXTERNAL_STORAGE só se realmente precisar
        ];
        permissions.requestPermissions(list, status => {
            if (status.hasPermission) {
                console.log("✅ Permissões concedidas.");
                resolve(true);
            } else {
                console.warn("⚠️ Permissões ainda não concedidas.");
                resolve(false);
            }
        }, err => {
            console.error("Erro ao solicitar permissões:", err);
            resolve(false);
        });
    });
}


// -------------------------
// Funções de Renderização
// -------------------------
function renderizarMusicas(docs) {
    const tbody = document.getElementById('corpo-tabela');
    if (!tbody) return;
    tbody.innerHTML = docs.map(doc => `
        <tr>
            <td><span class="badge-genero">${doc.pasta || 'Raiz'}</span></td>
            <td><strong>${doc.nome}</strong></td>
            <td>
                <button class="btn-icon" onclick="visualizarArquivo('${doc._id}', '${doc.nome}')">
                    <span class="material-icons">visibility</span>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderizarPastas(pastas) {
    const lista = document.getElementById('lista-pastas');
    if (!lista) return;
    lista.innerHTML = pastas.map(p => `
        <li>${p.uri}</li>
    `).join('');
}

// -------------------------
// Funções de Ação
// -------------------------
async function carregarMusicas() {
    const docs = await DBManager.listarMusicas();
    renderizarMusicas(docs);
}

function visualizarArquivo(id, titulo) {
    if (!id) return;
    window.location.href = `viewer.html?id=${encodeURIComponent(id)}&title=${encodeURIComponent(titulo)}`;
}

// -------------------------
// Integração com FolderPicker
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
    const btnPick = document.getElementById("btnPickFolder");
    if (btnPick) {
        btnPick.addEventListener("click", () => {
            if (!cordova.plugins || !cordova.plugins.FolderPicker) {
                alert("FolderPicker não disponível neste ambiente.");
                return;
            }
            cordova.plugins.FolderPicker.openFolderPicker(
                async function(uri) {
                    console.log("📂 Pasta escolhida:", uri);
                    await DBManager.addFolder(uri);
                    const pastas = await DBManager.listFolders();
                    renderizarPastas(pastas);
                },
                function(err) {
                    console.error("Erro ao escolher pasta:", err);
                    alert("Erro ao escolher pasta: " + err);
                }
            );
        });
    }
});

// ================================
// TESTE DO FOLDERPICKER (adicionar no final do app.js)
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const btnTestar = document.getElementById("btnTestarFolderPicker");
    const resultadoDiv = document.getElementById("testeResultado");
    
    if (btnTestar && resultadoDiv) {
        btnTestar.addEventListener("click", async () => {
            resultadoDiv.style.display = 'block';
            resultadoDiv.style.background = '#d1ecf1';
            resultadoDiv.style.border = '1px solid #bee5eb';
            resultadoDiv.style.borderRadius = '5px';
            resultadoDiv.innerHTML = '⏳ Testando FolderPicker...';
            
            // Teste 1: Cordova disponível?
            if (!window.cordova) {
                resultadoDiv.style.background = '#f8d7da';
                resultadoDiv.style.borderColor = '#f5c6cb';
                resultadoDiv.innerHTML = `
                    <strong>❌ FALHA: Cordova NÃO carregado</strong><br>
                    Não está rodando no ambiente Cordova (talvez no navegador?)<br>
                    Plugins disponíveis: ${window.cordova ? JSON.stringify(cordova.plugins) : 'N/A'}
                `;
                return;
            }
            
            resultadoDiv.innerHTML = '✅ Cordova carregado. Verificando plugins...';
            console.log('Plugins disponíveis:', Object.keys(cordova.plugins || {}));
            
            // Teste 2: FolderPicker existe?
            if (!cordova.plugins || !cordova.plugins.FolderPicker) {
                resultadoDiv.style.background = '#f8d7da';
                resultadoDiv.style.borderColor = '#f5c6cb';
                resultadoDiv.innerHTML = `
                    <strong>❌ FALHA: Plugin FolderPicker não encontrado</strong><br>
                     
                    Plugins disponíveis: ${JSON.stringify(cordova.plugins ? Object.keys(cordova.plugins) : [])}<br>
                    <br>
                    <strong>Solução:</strong><br>
                    1. No PowerShell do seu projeto:<br>
                    <code style="display:block;background:#333;color:#0f0;padding:10px;">npm install cordova-plugin-folder-picker<br>cordova platform rm android<br>cordova platform add android</code>
                `;
                return;
            }
            
            resultadoDiv.innerHTML = '✅ FolderPicker encontrado. Abrindo seletor...';
            
            // Teste 3: Abrir o seletor
            cordova.plugins.FolderPicker.openFolderPicker(
                function(uri) {
                    console.log('📂 PASTA ESCOLHIDA:', uri);
                    resultadoDiv.style.background = '#d4edda';
                    resultadoDiv.style.borderColor = '#c3e6cb';
                    resultadoDiv.innerHTML = `
                        <strong>✅ SUCESSO! FolderPicker FUNCIONA!</strong><br><br>
                        URI retornado:<br>
                        <code style="display:block;background:#333;color:#0f0;padding:10px;word-break:break-all;">${uri}</code><br>
                        <br>
                        <strong>O que isso significa:</strong><br>
                        • O SAF (Storage Access Framework) está operante<br>
                        • VOCÊ NÃO PRECISA DA PERMISSÃO DE ARQUIVO<br>
                        • Use este URI direto no DBManager.addFolder(uri)<br>
                        • Ignore o erro de permissão anterior
                    `;
                },
                function(err) {
                    console.error('❌ ERRO FolderPicker:', err);
                    resultadoDiv.style.background = '#f8d7da';
                    resultadoDiv.style.borderColor = '#f5c6cb';
                    resultadoDiv.innerHTML = `
                        <strong>❌ FALHA ao abrir FolderPicker</strong><br>
                        Erro: ${JSON.stringify(err)}<br>
                        <br>
                        <strong>Tente:</strong><br>
                        • Recriar plataforma Android<br>
                        • Verificar logcat: adb logcat | findstr FolderPicker
                    `;
                }
            );
        });
    }
});
