"use strict";

// ==================== UTILIDADES GLOBAIS ====================
window.getFullPath = function(fileObj) {
  if (fileObj.fullPath) return fileObj.fullPath;
  
  // Cordova Android
  if (window.cordova && cordova.platformId === 'android') {
    return fileObj.nativeURL || fileObj.fullPath;
  }

  // Windows UWP
  if (window.Windows) {
    return fileObj.path || '';
  }

  // Desktop/Linux
  const rootPasta = localStorage.getItem('rootPasta') || '';
  return rootPasta + (fileObj.path || fileObj.name);
};

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

// ==================== GERENCIADOR DO BANCO DE DADOS ====================
class PouchDBManager {
  constructor(dbName = 'repertorio_musicas') {
    this.dbName = dbName;
    this.db = null;
    this.cachedFiles = [];
  }

  async init() {
    if (typeof PouchDB === 'undefined') {
      throw new Error('PouchDB não carregado');
    }
    
    this.db = new PouchDB(this.dbName);
    await this.loadData();
    return this;
  }

  async loadData() {
    try {
      const result = await this.db.allDocs({include_docs: true});
      this.cachedFiles = result.rows.map(r => r.doc);
      return this.cachedFiles;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      throw error;
    }
  }

  async readAll(query = '') {
    try {
      await this.init();
      let files = this.cachedFiles.slice();
      
      if (query) {
        files = files.filter(f => 
          (f.pasta || '').includes(query) ||
          (f.titulo || '').toLowerCase().includes(query.toLowerCase()) ||
          (f.artista || '').toLowerCase().includes(query.toLowerCase())
        );
      }
      
      return files;
    } catch (error) {
      console.error('Erro ao ler dados:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const doc = await this.db.get(id);
      await this.db.remove(doc);
      await this.loadData();
      return true;
    } catch (error) {
      console.error('Erro ao deletar:', error);
      throw error;
    }
  }

  async bulkDocs(docs) {
    try {
      const result = await this.db.bulkDocs(docs);
      await this.loadData();
      return result;
    } catch (error) {
      console.error('Erro ao salvar múltiplos documentos:', error);
      throw error;
    }
  }

  async exportToPDF(files) {
    // Implementação futura de exportação para PDF
    console.log('Exportando para PDF:', files.length);
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// ==================== APLICAÇÃO PRINCIPAL ====================
class RepertorioApp {
  constructor() {
    this.isCordova = !!(window.cordova || window.PhoneGap || window.Cordova);
    this.musicas = [];
    this.generos = [];
    this.manager = new PouchDBManager();
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
    
    // Eventos de ferramentas (se existirem)
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', (e) => this.setDrawingTool(e.target.dataset.tool));
    });
  }

  // ==================== GERENCIAMENTO DE PASTAS ====================
  async scanPastaCompleta(pastaPath = '') {
    try {
      let result;
      
      if (this.isCordova) {
        result = await this.scanWithCordova(pastaPath);
      } else {
        result = await this.scanWithFileAPI(pastaPath);
      }
      
      this.musicas = result.musicas.map(m => ({
        ...m,
        pasta: pastaPath || result.pasta,
        fullPath: window.getFullPath(m)
      }));
      
      return this.musicas;
    } catch (error) {
      console.error('Erro ao escanear pasta:', error);
      throw error;
    }
  }

  async scanWithCordova(pastaPath) {
    // Implementação específica para Cordova
    const fileEntries = await new Promise((resolve, reject) => {
      fileChooser.open({mimeTypes: ['application/pdf']}, resolve, reject);
    });
    
    return {
      pasta: pastaPath || 'cordova',
      musicas: fileEntries.map(entry => ({
        name: entry.name,
        path: entry.nativeURL,
        size: entry.size
      }))
    };
  }

  async scanWithFileAPI(pastaPath) {
    // Implementação para navegador/desktop
    const dirHandle = await window.showDirectoryPicker();
    const musicas = [];
    
    for await (const entry of dirHandle.values()) {
      if (entry.name.endsWith('.pdf')) {
        const file = await entry.getFile();
        musicas.push({
          name: entry.name,
          path: entry.name,
          size: file.size
        });
      }
    }
    
    return {
      pasta: pastaPath || dirHandle.name,
      musicas
    };
  }

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
  async saveMusicas(pasta = '') {
    try {
      if (!this.manager.db) {
        throw new Error('Banco de dados não inicializado');
      }
      
      const docs = this.musicas.map(m => ({
        _id: m._id || `musica_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        _rev: m._rev,
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
      showMessage(`${docs.length} músicas salvas`, 'success');
      return true;
    } catch (error) {
      console.error('Erro ao salvar músicas:', error);
      throw error;
    }
  }

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

  updateGenreSelect() {
    const select = document.getElementById('genre-select');
    if (!select) return;
    
    this.generos = [...new Set(this.musicas.map(m => m.genero).filter(Boolean))].sort();
    
    select.innerHTML = '<option value="">Todos os gêneros</option>' + 
      this.generos.map(g => `<option value="${g}">${g}</option>`).join('');
  }

  filterMusicas(termo = '', genero = '') {
    try {
      const filtered = this.musicas.filter(m => {
        const matchesTerm = !termo || 
          (m.titulo || '').toLowerCase().includes(termo.toLowerCase()) ||
          (m.artista || '').toLowerCase().includes(termo.toLowerCase());
        
        const matchesGenre = !genero || m.genero === genero;
        
        return matchesTerm && matchesGenre;
      });
      
      this.renderTable(filtered);
      return filtered;
    } catch (error) {
      console.error('Erro ao filtrar músicas:', error);
      throw error;
    }
  }

  renderTable(musicas) {
    const tbody = document.querySelector('#music-table-tbody');
    if (!tbody) return;
    
    if (!musicas || musicas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="p-12 text-center text-gray-500">
            <span class="material-icons text-6xl block mb-6 opacity-50">library_music</span>
            <div class="text-2xl font-medium mb-4">Nenhuma música encontrada</div>
            <div class="text-lg opacity-75">${this.musicas.length ? 'Filtro não retornou resultados' : 'Adicione músicas primeiro'}</div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = musicas.map(m => `
      <tr class="hover:bg-emerald-50/50 border-b border-emerald-100 transition-colors">
        <td class="p-6 font-mono text-sm text-gray-600">${(m.pasta || m.fullPath || '').split(/[\/]/).pop()}</td>
        <td class="p-6">
          <span class="genre-badge px-3 py-1 rounded-full text-xs font-semibold ${this.getGenreColorClass(m.genero)}">
            ${m.genero}
          </span>
        </td>
        <td class="p-6 text-gray-700">${m.artista}</td> 
        <td class="p-6">
          <span class="font-bold text-lg text-gray-900 truncate block">${m.titulo}</span>
          <span class="text-xs text-gray-400 font-mono truncate block">${m.path}</span>
        </td>
        <td class="p-6 flex gap-2">
          <a href="viewer.html?path=${encodeURIComponent(window.getFullPath(m))}&mode=view" 
             class="p-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-2xl shadow transition-all" 
             title="Visualizar">
            <span class="material-icons">visibility</span>
          </a>
          <a href="viewer.html?path=${encodeURIComponent(window.getFullPath(m))}&mode=edit" 
             class="p-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-2xl shadow transition-all" 
             title="Editar">
            <span class="material-icons">edit</span>
          </a>
        </td>
      </tr>
    `).join('');
  }

  getGenreColorClass(genero) {
    const colors = {
      'Geral': 'bg-gray-100 text-gray-800',
      'Sertanejo': 'bg-amber-100 text-amber-800',
      'Rock': 'bg-red-100 text-red-800',
      'MPB': 'bg-emerald-100 text-emerald-800',
      'Pop': 'bg-blue-100 text-blue-800',
      'Gospel': 'bg-purple-100 text-purple-800'
    };
    return colors[genero] || 'bg-gray-100 text-gray-800';
  }

  // ==================== FUNÇÕES DE INTERFACE ====================
  scanPDFs() {
    showMessage('Escaneando arquivos PDF...', 'info');
    // Implementação específica pode ser adicionada aqui
  }

  checkCordovaReady() {
    if (!this.isCordova) return;
    
    document.addEventListener('deviceready', () => {
      console.log('Dispositivo Cordova pronto');
      this.isCordovaReady = true;
    }, false);
  }

  setDrawingTool(tool) {
    window.currentTool = tool;
    showMessage(`Ferramenta definida: ${tool}`, 'info');
  }

  closePDFViewer() {
    const modal = document.getElementById('pdf-modal');
    if (modal) modal.style.display = 'none';
  }
}

// ==================== CONFIGURAÇÕES DA APLICAÇÃO ====================
window.ConfigApp = {
  async loadPastas() {
    const lista = document.getElementById('lista-pastas');
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
    return path.replace(/'/g, "\'").replace(/"/g, '\"');
  },

  async refreshPasta(pastaPath) {
    if (!confirm(`Atualizar todas as músicas na pasta "${pastaPath.split(/[\/]/).pop()}"?`)) {
      return;
    }
    
    showMessage(`Atualizando pasta...`, 'info');
    
    try {
      await window.app.scanPastaCompleta(pastaPath);
      await window.app.saveMusicas(pastaPath);
      await window.app.loadMusicas();
      this.loadPastas();
      showMessage('Pasta atualizada com sucesso', 'success');
    } catch (error) {
      showMessage(`Erro ao atualizar pasta: ${error.message}`, 'error');
    }
  },

  async deletePasta(pastaPath) {
    const pastaNome = pastaPath.split(/[\/]/).pop();
    if (!confirm(`Remover permanentemente a pasta "${pastaNome}" e todas as ${await this.countMusicasInPasta(pastaPath)} músicas?`)) {
      return;
    }
    
    showMessage(`Removendo pasta...`, 'info');
    
    try {
      const files = await window.app.manager.readAll(pastaPath);
      await Promise.all(files.map(f => window.app.manager.delete(f._id)));
      
      this.loadPastas();
      await window.app.loadMusicas();
      showMessage('Pasta removida com sucesso', 'success');
    } catch (error) {
      showMessage(`Erro ao remover pasta: ${error.message}`, 'error');
    }
  },

  async countMusicasInPasta(pastaPath) {
    const files = await window.app.manager.readAll(pastaPath);
    return files.length;
  },

  async adicionarPasta() {
    showMessage('Selecionando pasta...', 'info');
    
    try {
      await window.app.scanPastaCompleta();
      
      if (window.app.musicas.length === 0) {
        showMessage('Nenhum arquivo PDF encontrado na pasta selecionada', 'warning');
        return;
      }
      
      const pastaPath = window.app.musicas[0].pasta;
      localStorage.setItem('currentPasta', pastaPath);
      
      await window.app.saveMusicas(pastaPath);
      await window.app.loadMusicas();
      this.loadPastas();
      
      showMessage(`Pasta "${pastaPath.split(/[\/]/).pop()}" adicionada com ${window.app.musicas.length} músicas`, 'success');
    } catch (error) {
      showMessage(`Erro ao adicionar pasta: ${error.message}`, 'error');
    }
  }
};

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  window.app = new RepertorioApp();
  window.app.init();
  
  const btn = document.getElementById('selecionar-pasta');
  if (btn) {
    btn.addEventListener('click', () => window.ConfigApp.adicionarPasta());
  }
  
  window.ConfigApp.loadPastas();
});