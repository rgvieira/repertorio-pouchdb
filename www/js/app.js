/**
 * js/app.js - Lógica principal do Repertório
 */

window.app_initialized = false;

// Objeto para gerenciar as funções de Favoritos/Repertório
const App = {
    pathMusicaSelecionada: null,

    // Abre o modal e carrega as listas do banco
    async abrirModalFavoritos(fullPath) {
        this.pathMusicaSelecionada = fullPath;
        const modal = document.getElementById('modal-favoritos');
        const container = document.getElementById('lista-reps-modal');
        
        if (!modal || !container) return;

        try {
            // Busca os documentos do tipo repertorio
// Procure esta linha no app.js e substitua:
const res = await db.find({ 
    selector: { 
        $or: [
            { type: 'repertorio' },
            { tipo: 'repertorio' }
        ]
    } 
});
            // Ordena A-Z
            const sorted = res.docs.sort((a, b) => 
                a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
            );
            
            container.innerHTML = sorted.length ? '' : '<p style="padding:10px; color:#666;">Nenhum repertório criado.</p>';
            
            sorted.forEach(rep => {
                const div = document.createElement('div');
                div.className = 'item-rep-modal'; // Estilo definido no index.html
                div.innerHTML = `<span class="material-icons" style="color:#186879">queue_music</span> <span>${rep.nome}</span>`;
                div.onclick = () => this.adicionarMusicaAoRep(rep._id);
                container.appendChild(div);
            });

            modal.style.display = 'flex';
        } catch (e) {
            console.error("Erro ao carregar repertórios:", e);
        }
    },

    // Salva o path no array de musicas do documento escolhido
async adicionarMusicaAoRep(repId) {
        try {
            const repDoc = await db.get(repId);
            
            // Garante que o array existe
            if (!repDoc.musicas) repDoc.musicas = [];
            
            // Normaliza o path para comparação (remove barras duplicadas extras)
            const pathNormalizado = this.pathMusicaSelecionada.replace(/\\\\/g, '\\');

            // Verifica se já existe
            const jaExiste = repDoc.musicas.some(m => {
                const mNormal = (typeof m === 'string' ? m : (m.path || "")).replace(/\\\\/g, '\\');
                return mNormal === pathNormalizado;
            });

            if (!jaExiste) {
                // Adiciona o path (usamos o original selecionado)
                repDoc.musicas.push(this.pathMusicaSelecionada);
                
                await db.put(repDoc);
                alert("Música adicionada ao repertório!");
            } else {
                alert("Esta música já está nesta lista.");
            }
            
            document.getElementById('modal-favoritos').style.display = 'none';
        } catch (e) {
            alert("Erro ao salvar no banco de dados.");
            console.error(e);
        }
    }
};

// Tenta iniciar pelo Cordova ou pelo Navegador/Electron
document.addEventListener('deviceready', onDeviceReady, false);
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(onDeviceReady, 100);
}, false);


function toggleFabMenu() {
    const menu = document.getElementById('fab-menu');
    menu.classList.toggle('open');
    
    const closeMenu = (e) => {
        if (!e.target.closest('.fab-container')) {
            menu.classList.remove('open');
            document.removeEventListener('click', closeMenu);
        }
    };
    
    if (menu.classList.contains('open')) {
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
}


async function onDeviceReady() {
    if (window.app_initialized) return;
    window.app_initialized = true;

    console.log('--- Repertório: Iniciando Aplicação ---');
    
    try {
        await DBManager.init();
        await carregarMusicas();
        
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

    renderizarMusicas(musicas);
}

/**
 * js/app.js - Parte da Renderização
 */
// No app.js, substitua a função renderizarMusicas:
function renderizarMusicas(docs) {
    const tbody = document.getElementById('corpo-tabela');
    if (!tbody) return;
    tbody.innerHTML = '';

    docs.forEach(doc => {
        const tr = document.createElement('tr');
//console.log("Renderizando música:", doc);        
        // Agora tenta pegar nome ou titulo, o que estiver preenchido
        const nomeExibicao = doc.nome  || " ";
        const pastaExibicao = doc.pasta || "Raiz";
        const pathSeguro = doc._id.replace(/\\/g, '\\\\');

        tr.innerHTML = `
            <td><span class="badge-genero">${pastaExibicao}</span></td>
            <td><strong>${nomeExibicao}</strong></td>
            <td>
                <div class="acoes-container">
    <button class="btn-icon" onclick="visualizarArquivo('${pathSeguro}', '${nomeExibicao}')">
                <span class="material-icons">visibility</span>
            </button>

                    <button class="btn-icon" onclick="abrirLetra('${nomeExibicao}')" title="Ver Letra">
                        <span class="material-icons">description</span>
                    </button>
                    <button class="btn-icon" onclick="abrirVideo('${nomeExibicao}')" title="Ver Vídeo">
                        <span class="material-icons">play_circle</span>
                    </button>                    
                    <button class="btn-icon" onclick="App.abrirModalFavoritos('${pathSeguro}')" title="Adicionar ao Repertório">
                        <span class="material-icons" style="color: #FFD700">star</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
 
function abrirLetra(nomeMusica) {
    const url = `https://www.google.com/search?q=letra+musica+${encodeURIComponent(nomeMusica)}`;
    if (window.electronAPI) {
        window.electronAPI.abrirLink(url);
    } else {
        window.open(url, '_blank');
    }
}

function abrirVideo(nomeMusica) {
    const url = `https://www.google.com/search?q=video+youtube+${encodeURIComponent(nomeMusica)}`;
    if (window.electronAPI) {
        window.electronAPI.abrirLink(url);
    } else {
        window.open(url, '_blank');
    }
}
function visualizarArquivo(path, titulo) {
    if (!path) return;
    // Use encodeURIComponent no título também para evitar erro com espaços e acentos
    window.location.href = `viewer.html?file=${encodeURIComponent(path)}&title=${encodeURIComponent(titulo)}`;
}

function abrirExterno(url) {
    if (window.process && window.process.versions && window.process.versions.electron) {
        const { shell } = window.require('electron');
        shell.openExternal(url);
    } else {
        window.open(url, '_system');
    }
}