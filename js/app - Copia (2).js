"use strict";

// ==================== UTILIDADES GLOBAIS ====================
// --- getFullPath (definição segura) ---
if (typeof window.getFullPath !== 'function') {
  window.getFullPath = function(fileObj) {
    if (!fileObj) return '';
    if (fileObj.fullPath) return fileObj.fullPath;
    if (window.cordova && cordova.platformId === 'android') {
      return fileObj.nativeURL || fileObj.fullPath || '';
    }
    if (window.Windows) {
      return fileObj.path || fileObj.fullPath || '';
    }
    const rootPasta = localStorage.getItem('rootPasta') || '';
    const suffix = fileObj.path || fileObj.name || '';
    if (!rootPasta) return suffix;
    const sep = rootPasta.endsWith('/') || rootPasta.endsWith('\\') ? '' : '/';
    return rootPasta + sep + suffix;
  };
}

// --- selectFolder: browser (File System Access API) ou fallback Cordova ---
// --- selectFolder: normaliza retorno { name, pasta, musicas } ---
if (typeof window.selectFolder !== 'function') {
  window.selectFolder = async function() {
    if (window.cordova && typeof window.cordovaPickerSelectFolder === 'function') {
      return await window.cordovaPickerSelectFolder();
    }
    if (!window.showDirectoryPicker) {
      throw new Error('API de diretório não disponível neste navegador');
    }
    const dirHandle = await window.showDirectoryPicker();
    const result = { name: dirHandle.name || '', pasta: dirHandle.name || '', musicas: [] };
    async function readDir(handle, path = '') {
      for await (const [name, entry] of handle.entries()) {
        const entryPath = path ? `${path}/${name}` : name;
        if (entry.kind === 'file') {
          if (name.toLowerCase().endsWith('.pdf')) {
            try {
              const file = await entry.getFile();
              result.musicas.push({ name, path: entryPath, size: file.size, lastModified: file.lastModified, fileHandle: entry });
            } catch (err) { console.warn('Erro ao obter arquivo', name, err); }
          }
        } else if (entry.kind === 'directory') {
          await readDir(entry, entryPath);
        }
      }
    }
    await readDir(dirHandle);
    return result;
  };
}


// --- buildTreeFromPaths: cria árvore a partir de paths (ex: "sub/dir/file.pdf")
function buildTreeFromPaths(paths) {
  const root = { name: '', children: {}, files: [] };
  for (const p of paths) {
    const parts = p.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = (i === parts.length - 1) && part.includes('.');
      if (isFile) {
        node.files.push(part);
      } else {
        if (!node.children[part]) node.children[part] = { name: part, children: {}, files: [] };
        node = node.children[part];
      }
    }
  }
  function normalize(node) {
    const childrenArr = Object.values(node.children).map(normalize);
    return { name: node.name, files: node.files.slice(), children: childrenArr };
  }
  return normalize(root);
}

// --- savePastaToPouchDB: salva doc 'pasta::...' com tree + flat list
async function savePastaToPouchDB(result) {
  if (!result) throw new Error('Resultado inválido');
  if (!window.PouchDB) throw new Error('PouchDB não carregado');
  const db = window.app?.db || new PouchDB('repertorio');
  const id = `pasta::${Date.now()}`;
  const paths = (result.musicas || []).map(m => m.path || m.name || m.filePath || m.fullPath).filter(Boolean);
  const tree = buildTreeFromPaths(paths);
  const doc = {
    _id: id,
    type: 'pasta',
    name: result.name || result.pasta || id,
    pasta: result.pasta || result.name || '',
    createdAt: new Date().toISOString(),
    countFiles: paths.length,
    tree,
    flat: result.musicas || []
  };
  await db.put(doc);
  return doc;
}


function showMessage(text, type = 'info') {
  const msg = document.getElementById('message') || document.getElementById('config-message');
  if (!msg) return;
  
  const colors = {
    'success': 'bg-emerald-500',
    'error': 'bg-rose-500', 
    'info': 'bg-blue-500',
    'warning': 'bg-amber-500'
  };
  
  msg.className = `fixed top-4 right-4 ${colors[type] || 'bg-blue-500'} text-white px-6 py-3 rounded-xl shadow-lg z-50 font-medium max-w-md mx-auto animate-fade-in`;
  msg.textContent = text;
  msg.style.display = 'block';
  
  setTimeout(() => {
    msg.classList.replace('animate-fade-in', 'animate-fade-out');
    setTimeout(() => msg.style.display = 'none', 500);
  }, 4000);
}



// ==================== APLICAÇÃO PRINCIPAL ====================
class RepertorioApp {
  constructor() {
    this.isCordova = !!(window.cordova || window.PhoneGap || window.Cordova);
    this.musicas = [];
    this.generos = [];
    
    this.manager = new window.PouchDBManager();

    this.currentPasta = localStorage.getItem('currentPasta') || '';
  }

  async init() {
    try {
      await this.manager.init();
      this.bindEvents();
      await this.loadMusicas();
      this.checkCordovaReady();
      showMessage('Aplicação carregada', 'success');
    } catch (error) {
      showMessage(`Erro ao iniciar: ${error.message}`, 'error');
    }
  }

  
  updateGenreSelect() {
    const select = document.getElementById('genre-select');
    if (!select) return;
    
    this.generos = [...new Set(this.musicas.map(m => m.genero).filter(Boolean))].sort();
    
    select.innerHTML = '<option value="">Todos os gêneros</option>' + 
      this.generos.map(g => `<option value="${g}">${g}</option>`).join('');
  }

  bindEvents() {
    // Eventos de busca/filtro
    const searchInput = document.getElementById('search-input');
    const genreSelect = document.getElementById('genre-select');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => 
        this.filterMusicas(e.target.value, genreSelect?.value)
      );
    }
    
    if (genreSelect) {
      genreSelect.addEventListener('change', (e) => 
        this.filterMusicas(searchInput?.value, e.target.value)
      );
    }

    // Eventos de ação
    document.getElementById('scan-btn')?.addEventListener('click', () => this.scanPDFs());
    document.getElementById('close-modal')?.addEventListener('click', () => this.closePDFViewer());
  }

  // ==================== GERENCIAMENTO DE PASTAS ====================
  async loadPastasFromDB() {
    try {
      const files = await this.manager.readAll();
      const grouped = files.reduce((acc, f) => {
        const pasta = f.pasta || (f.fullPath ? f.fullPath.split(/[\/]/)[0] : '/');
        acc[pasta] = (acc[pasta] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(grouped).map(([caminho, total]) => ({
        caminho, 
        total,
        nome: caminho.split(/[\/]/).pop()
      }));
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
      throw error;
    }
  }

  // ==================== GERENCIAMENTO DE MÚSICAS ====================
  async loadMusicas() {
    try {
      const files = await this.manager.readAll();
      
      this.musicas = files.map(f => ({
        _id: f._id,
        name: f.name,
        titulo: f.titulo || f.name.replace('.pdf', ''),
        artista: f.artista || 'Desconhecido',
        genero: f.genero || 'Geral',
        path: f.path,
        fullPath: f.fullPath,
        pasta: f.pasta,
        size: f.size,
        _rev: f._rev
      }));
      
      this.updateGenreSelect();
      this.renderTable(this.musicas);
      return this.musicas;
    } catch (error) {
      console.error('Erro ao carregar músicas:', error);
      throw error;
    }
  }

  
  async scanPastaCompleta() {
    console.log("scanPastaCompleta - isCordova:", this.isCordova);
    const result = await selectFolder();
    console.log("Picker:", result);
    this.musicas = result.musicas.map(m => ({
      ...m,
      pasta: result.pasta
    }));
  }

 async saveMusicas(pasta = '') {

    if (!this.manager || !this.manager.db) {
    await this.manager.init();
  }
  const docs = this.musicas.map(m => ({
    _id: m._id || `musica_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: m.name,
    titulo: m.titulo || m.name.replace('.pdf', ''),
    artista: m.artista || 'Desconhecido',
    genero: m.genero || 'Geral',
    path: m.path,
    fullPath: m.fullPath,
    pasta: pasta || m.pasta || this.currentPasta,
    size: m.size,
    updatedAt: new Date().toISOString()
  }));
  await this.manager.bulkDocs(docs);
  window.showMessage(`${docs.length} músicas salvas`, 'success');
}


  async loadMusicas() {
    const files = await this.manager.readAll();
    this.musicas = files.map(f => ({
      _id: f._id,
      name: f.name,
      titulo: f.titulo || f.name.replace(".pdf", ""),
      artista: f.artista || "Desconhecido",
      genero: f.genero || "Geral",
      path: f.path,
      fullPath: f.fullPath,
      pasta: f.pasta,
      size: f.size
    }));
    this.updateGenreSelect();
    this.renderTable(this.musicas);
  }

  async loadPastasFromDB() {
    const files = await this.manager.readAll();
    const grouped = files.reduce((acc, f) => {
      const pasta = f.pasta || f.fullPath ? f.fullPath.split(/[\\\\/]/)[0] || "/" : "/";
      acc[pasta] = (acc[pasta] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([caminho, total]) => ({caminho, total}));
  }

 

  filterMusicas(termo) {
    const genre = document.getElementById("genre-select") ? document.getElementById("genre-select").value : "";
    const filtered = this.musicas.filter(m => 
      (m.titulo || "").toLowerCase().includes(termo.toLowerCase()) ||
      (m.artista || "").toLowerCase().includes(termo.toLowerCase())
    ).filter(m => !genre || m.genero === genre);
    this.renderTable(filtered);
  }

  renderTable(musicas) {
    const tbody = document.querySelector("#music-table-tbody");
    if (!tbody) return;
    
    if (!musicas || musicas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-500"><span class="material-icons text-6xl block mb-6 opacity-50">library_music</span><div class="text-2xl font-medium mb-4">Nenhuma música encontrada</div><div class="text-lg opacity-75">Configure pastas primeiro</div></td></tr>';
      return;
    }

    tbody.innerHTML = musicas.map(m => `
      <tr class="hover:bg-emerald-50/50 border-b border-emerald-100 transition-colors">
        <td class="p-6 font-mono text-sm text-gray-600">${(m.pasta || m.fullPath || "").split(/[\\\\/]/).pop()}</td>
        <td class="p-6">${m.genero}</td>
        <td class="p-6 text-gray-700">${m.artista}</td>
        <td class="p-6">
          <span class="font-bold text-lg text-gray-900 truncate">${m.titulo}</span>
          ${m.fullPath}
          ${m.path}
          ${m.pastaPath}
        </td>
        <td class="p-6">
          <a href="viewer.html?path=${encodeURIComponent(m.fullPath)}" class="p-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-2xl shadow transition-all">
            <span class="material-icons">visibility</span>
          </a>
          <a href="viewer.html?path=${encodeURIComponent(m.fullPath)}&mode=edit" class="p-3 ml-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-2xl shadow transition-all">
            <span class="material-icons">edit</span>
          </a>
        </td>
      </tr>
    `).join("");
  }

  scanPDFs() {
    showMessage("Escaneando...", "info");
  }

  checkCordovaReady() {
    document.addEventListener("deviceready", () => {
      this.isCordova = true;
      console.log("Cordova deviceready");
    });
  }

  closePDFViewer() {
    const modal = document.getElementById("pdf-modal");
    if (modal) modal.style.display = "none";
  }
}

// ==================== CONFIGURAÇÕES DA APLICAÇÃO ====================
window.ConfigApp = {
  async loadPastas() {
    const lista = document.getElementById('folders-list');
    if (!lista) return;
    
    lista.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <span class="material-icons text-4xl mr-4 text-blue-400 animate-spin">refresh</span>
        Carregando pastas...
      </div>
    `;
    
    try {
      const pastas = await window.app.loadPastasFromDB();
      
      if (!pastas || pastas.length === 0) {
        lista.innerHTML = `
          <div class="p-12 text-center border-2 border-dashed border-gray-300 rounded-3xl bg-gray-50">
            <span class="material-icons text-6xl block mb-8 text-gray-400">folder_open</span>
            <div class="text-2xl font-bold text-gray-700 mb-4">Nenhuma pasta encontrada</div>
            <div class="text-lg text-gray-500">Adicione uma pasta para começar</div>
          </div>
        `;
        return;
      }
      
      lista.innerHTML = pastas.map(pasta => `
        <div class="group flex items-center gap-4 p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl border-2 border-cyan-200 shadow-xl hover:shadow-2xl hover:border-blue-300 transition-all hover:-translate-y-1 mb-4">
          <div class="flex-1">
            <div class="font-black text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              ${pasta.nome}
            </div>
            <div class="text-xs font-mono bg-white/70 px-4 py-2 rounded-full border border-gray-200 shadow-sm">
              ${pasta.caminho}
            </div>
            <div class="text-emerald-700 font-bold mt-2 text-lg">
              ${pasta.total} ${pasta.total === 1 ? 'música' : 'músicas'}
            </div>
          </div>
          <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
            <button onclick="ConfigApp.refreshPasta('${this.escapePath(pasta.caminho)}')" 
                    class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl shadow hover:shadow-md transition-all">
              <span class="material-icons text-lg">refresh</span>
              Atualizar
            </button>
            <button onclick="ConfigApp.deletePasta('${this.escapePath(pasta.caminho)}')" 
                    class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl shadow hover:shadow-md transition-all">
              <span class="material-icons text-lg">delete</span>
              Remover
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      lista.innerHTML = `
        <div class="p-12 text-center text-red-500 border-2 border-red-200 rounded-3xl bg-red-50">
          <span class="material-icons text-6xl block mb-4">error</span>
          <div class="text-xl font-bold mb-2">Erro ao carregar pastas</div>
          <div class="text-sm">${error.message}</div>
        </div>
      `;
    }
  },

  escapePath(path) {
    return path.replace(/'/g, "\'").replace(/"/g, '"');
  },

  async refreshPasta(pastaPath) {
    if (!confirm(`Atualizar todas as músicas na pasta "${pastaPath.split(/[\/]/).pop()}"?`)) {
      return;
    }
    
    showMessage(`Atualizando pasta...`, 'info');
    
    try {
      await window.app.manager.init();
      const files = await this.readAll(pastaPath);
      showMessage('Pasta atualizada com sucesso', 'success');
      return files;
    } catch (error) {
      showMessage(`Erro ao atualizar pasta: ${error.message}`, 'error');
    }
  },

  async deletePasta(pastaPath) {
    const pastaNome = pastaPath.split(/[\/]/).pop();
    if (!confirm(`Remover permanentemente a pasta "${pastaNome}" e todas as músicas?`)) {
      return;
    }
    
    showMessage(`Removendo pasta...`, 'info');
    
    try {
      const files = await this.readAll(pastaPath);
      await Promise.all(files.map(f => window.app.manager.delete(f._id)));
      await this.loadPastas();
      showMessage('Pasta removida com sucesso', 'success');
    } catch (error) {
      showMessage(`Erro ao remover pasta: ${error.message}`, 'error');
    }
  }
};

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  const rootInput = document.getElementById('root-folder-input');
const saveRootBtn = document.getElementById('save-root-btn');
  console.log(window.location.pathname)
  window.app = new RepertorioApp();
  window.app.init();
  

// Preenche o campo com o valor salvo (se houver)
try {
  const savedRoot = localStorage.getItem('rootPasta') || '';
  if (rootInput) rootInput.value = savedRoot;
} catch (e) {
  console.warn('Erro ao ler localStorage rootPasta', e);
}

// Função utilitária para salvar e atualizar UI
function salvarRootPasta(pasta) {
  if (!pasta) return;
  try {
    localStorage.setItem('rootPasta', pasta);
  } catch (e) {
    console.warn('Erro ao salvar rootPasta', e);
  }
  if (rootInput) rootInput.value = pasta;
  // tenta atualizar lista de pastas se existir ConfigApp
  if (window.ConfigApp && typeof window.ConfigApp.loadPastas === 'function') {
    window.ConfigApp.loadPastas().catch(err => console.error('ConfigApp.loadPastas erro:', err));
  }
  if (typeof window.showMessage === 'function') window.showMessage(`Pasta raiz salva: ${pasta}`, 'success');
}

// Salvar ao clicar no botão Salvar
saveRootBtn?.addEventListener('click', () => {
  const rootInput = document.getElementById('root-folder-input');
  const pasta = rootInput?.value?.trim() || '';
  if (!pasta) return window.showMessage?.('Informe uma pasta antes de salvar', 'warning');
  localStorage.setItem('rootPasta', pasta);
  if (rootInput) rootInput.value = pasta;
  if (window.ConfigApp?.loadPastas) window.ConfigApp.loadPastas().catch(console.error);
  window.showMessage?.(`Pasta raiz salva: ${pasta}`, 'success');
});


// Salvar ao pressionar Enter no input
rootInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const pasta = rootInput.value.trim();
    salvarRootPasta(pasta);
  }
});  
  // Verifica se estamos na página de configurações
  if (window.location.pathname.includes('config.html')) {
    // Carrega a pasta raiz do localStorage
    const rootFolder = localStorage.getItem('rootPasta') || 'Nenhuma pasta definida';
console.log    (rootFolder)
    document.getElementById('root-folder-input').value = rootFolder;

    // Configura os listeners dos botões
    document.getElementById('select-folder-btn')?.addEventListener('click', async () => {
      try {
        // Scanner.abrirPicker() devolve o caminho REAL do sistema (ex: D:/Musicas)
        const folderPath = await Scanner.abrirPicker();
        if (folderPath) {
          localStorage.setItem('rootPasta', folderPath);
          document.getElementById('root-folder-input').value = folderPath;
          // Inicia o scanner imediatamente com o caminho absoluto resolvido
          await Scanner.escanearPasta(folderPath);
          await ConfigApp.loadPastas();
        }
      } catch (error) {
        console.error('Erro ao selecionar pasta:', error);
      }
    });

    document.getElementById('reload-btn')?.addEventListener('click', async () => {
      await ConfigApp.loadPastas();
    });

    // Carrega as pastas inicialmente
    ConfigApp.loadPastas();
  }
});