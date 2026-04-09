/**
 * js/app.js - Lógica principal do Repertório
 */

window.app_initialized = false;

// Tenta iniciar pelo Cordova ou pelo Navegador/Electron
document.addEventListener('deviceready', onDeviceReady, false);
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(onDeviceReady, 100);
}, false);

async function onDeviceReady() {
    if (window.app_initialized) return;
    window.app_initialized = true;

    console.log('--- Repertório: Iniciando Aplicação ---');
    
    try {
        await DBManager.init();
        await carregarMusicas();
        
        // Listeners para filtros
        const busca = document.getElementById('busca');
        const selecao = document.getElementById('genero-select');
        
        if (busca) busca.addEventListener('input', carregarMusicas);
        if (selecao) selecao.addEventListener('change', carregarMusicas);
        
    } catch (error) {
        console.error("Erro na inicialização:", error);
    }
}

async function carregarMusicas() {
    const filtroInput = document.getElementById('busca');
    const generoSelect = document.getElementById('genero-select');
    
    const filtro = filtroInput ? filtroInput.value : "";
    const genero = generoSelect ? generoSelect.value : "";
    
    const musicas = await DBManager.listarMusicas(filtro, genero);
    
    // Alimenta o select de gêneros apenas na primeira vez
    const select = document.getElementById('genero-select');
    if (select && select.options.length <= 1) {
        const generosUnicos = [...new Set(musicas.map(m => m.genero))].filter(Boolean).sort();
        generosUnicos.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            select.appendChild(opt);
        });
    }

    renderizarTabela(musicas);
}

function renderizarTabela(musicas) {
    const tbody = document.getElementById('lista-musicas');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (musicas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhuma música encontrada.</td></tr>';
        return;
    }

    musicas.forEach(m => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid var(--outline)";
        
    // 1. Pegamos o valor da chave correta do banco (fullPath)
console.log(m.fullPath)    
const pathOriginal = m.fullPath || ""; 

// 2. SEGURANÇA: Se tiver caminho, trata as barras do Windows para o JS não dar erro
const pathSeguro = pathOriginal ? pathOriginal.replace(/\\/g, '\\\\') : '';

// 3. Prepara o termo de busca para Google/YouTube
const termo = encodeURIComponent(`${m.titulo} ${m.artista || ''}`);

// 4. Monta a linha da tabela (TR)
tr.innerHTML = `
    <td style="padding:12px; font-size: 0.85rem;">${m.genero || '---'}</td>
    <td style="padding:12px; font-size: 0.85rem;">${m.artista || '---'}</td>
    <td style="padding:12px"><b>${m.titulo}</b></td>
    <td style="padding:12px; text-align:center; display: flex; gap: 8px; justify-content: center;">
        
${pathOriginal ? `
    <button class="btn-icon" onclick="visualizarArquivo('${pathSeguro}', '${encodeURIComponent(m.titulo)}')" title="Ver PDF">
        <span class="material-icons" style="color: var(--primary);">visibility</span>
    </button>` : `
    <span class="material-icons" style="color:#ccc" title="Arquivo não localizado">visibility_off</span>
`}
        <button class="btn-icon" onclick="abrirExterno('https://www.google.com/search?q=letra+${termo}')" title="Letra">
            <span class="material-icons" style="color: #566163;">lyrics</span>
        </button>

        <button class="btn-icon" onclick="abrirExterno('https://www.youtube.com/results?search_query=${termo}')" title="Vídeo">
            <span class="material-icons" style="color: #d32f2f;">play_circle</span>
        </button>
    </td>

        `;
        tbody.appendChild(tr);
    });
}

/**
 * Redireciona para o visualizador passando o caminho real do arquivo
 */
function visualizarArquivo(path, titulo) {
    if (!path) {
        alert("Caminho do arquivo não encontrado.");
        return;
    }
    window.location.href = `viewer.html?file=${encodeURIComponent(path)}&title=${titulo}`;
}

/**
 * Abre links externos (Letras/Vídeos) tratando Electron vs Browser/Cordova
 */
function abrirExterno(url) {
    // Se estiver no Electron (Desktop)
    if (window.process && window.process.versions && window.process.versions.electron) {
        const { shell } = window.require('electron');
        shell.openExternal(url);
    } else {
        // Se estiver no Cordova ou Navegador comum
        window.open(url, '_system');
    }
}