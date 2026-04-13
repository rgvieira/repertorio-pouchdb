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
            const res = await db.find({ selector: { type: 'repertorio' } });
            
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
            
            if (!repDoc.musicas) repDoc.musicas = [];
            
            // Verifica se já existe para não duplicar
            if (!repDoc.musicas.includes(this.pathMusicaSelecionada)) {
                repDoc.musicas.push(this.pathMusicaSelecionada);
                await db.put(repDoc);
                alert("Música adicionada ao repertório!");
            } else {
                alert("Esta música já está nesta lista.");
            }
            
            document.getElementById('modal-favoritos').style.display = 'none';
        } catch (e) {
            alert("Erro ao salvar.");
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
        
        // Lógica do botão de teste do FolderPicker (exclusivo da config.html)
        const btnTestar = document.getElementById('btnTestarFolderPicker');
        if (btnTestar && typeof Scanner !== 'undefined') {
            btnTestar.addEventListener('click', async () => {
                console.log("App: Testando FolderPicker...");
                const resDiv = document.getElementById('testeResultado');
                
                if (resDiv) {
                    resDiv.style.display = 'block';
                    resDiv.style.background = '#f0f0f0';
                    resDiv.style.color = '#333';
                    resDiv.innerText = "Aguardando seleção do usuário...";
                }

                try {
                    // Scanner.abrirPicker lida com Electron ou Android automaticamente
                    const path = await Scanner.abrirPicker();
                    
                    if (path) {
                        if (resDiv) {
                            resDiv.style.background = '#d4edda';
                            resDiv.style.color = '#155724';
                            resDiv.innerText = "Sucesso! Pasta selecionada:\n" + path;
                        }
                    } else {
                        if (resDiv) {
                            resDiv.style.background = '#fff3cd';
                            resDiv.style.color = '#856404';
                            resDiv.innerText = "Seleção cancelada ou nenhum caminho retornado.";
                        }
                    }
                } catch (err) {
                    console.error("Erro no teste do FolderPicker:", err);
                    if (resDiv) {
                        resDiv.style.background = '#f8d7da';
                        resDiv.style.color = '#721c24';
                        resDiv.innerText = "Erro: " + err.message;
                    }
                }
            });
        }
        
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
function renderizarMusicas(docs) {
    const tbody = document.querySelector('#tabela-musicas tbody') || document.getElementById('corpo-tabela');
    if (!tbody) return;
    tbody.innerHTML = '';

    docs.forEach(doc => {
        const tr = document.createElement('tr');
        
        // FORÇA O USO DE NOME E PASTA, mas mantém fallback para não quebrar
        const exibicaoNome = doc.nome || doc.titulo || "Sem Nome";
        const exibicaoPasta = doc.pasta || doc.genero || "Raiz";
        
        const pathSeguro = doc._id.replace(/\\/g, '\\\\');
        const termo = encodeURIComponent(exibicaoNome);

        tr.innerHTML = `
            <td><span class="badge-genero">${exibicaoPasta}</span></td>
            <td><strong>${exibicaoNome}</strong></td>
            <td class="acoes-cell">
                <button class="btn-icon" onclick="visualizarArquivo('${pathSeguro}', '${exibicaoNome}')">
                    <span class="material-icons" style="color: #186879;">visibility</span>
                </button>
                <button class="btn-icon" onclick="App.abrirModalFavoritos('${pathSeguro}')">
                    <span class="material-icons" style="color: #fbc02d;">star_border</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function visualizarArquivo(path, titulo) {
    if (!path) {
        alert("Caminho do arquivo não encontrado.");
        return;
    }
    window.location.href = `viewer.html?file=${encodeURIComponent(path)}&title=${titulo}`;
}

function abrirExterno(url) {
    if (window.process && window.process.versions && window.process.versions.electron) {
        const { shell } = window.require('electron');
        shell.openExternal(url);
    } else {
        window.open(url, '_system');
    }
}