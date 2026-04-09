"use strict";

class RepertorioPouchDBManager {
  constructor(dbName = "repertorio_musicas") {
    this.dbName = dbName;
    this.db = null;
    this.cachedFiles = [];
  }

  async init() {
    if (typeof PouchDB === 'undefined') {
      console.warn('PouchDB CDN necessario');
      return;
    }
    this.db = new PouchDB(this.dbName);
    await this.loadData();
    console.log('PouchDB OK');
  }

  async loadData() {
    if (!this.db) return [];
    const result = await this.db.allDocs({include_docs: true});
    this.cachedFiles = result.rows.map(r => r.doc);
  }

  async readAll(query = '') {
    await this.init();
    let files = this.cachedFiles;
    if (query) files = files.filter(f => f.pasta && f.pasta.includes(query));
    return files;
  }

  async delete(id) {
    await this.init();
    const doc = await this.db.get(id);
    await this.db.remove(doc);
    await this.loadData();
  }
}

window.RepertorioPouchDBManager = RepertorioPouchDBManager;
window.manager = new RepertorioPouchDBManager();

function showMessage(text, type = "info") {
  const msg = document.getElementById("message") || document.getElementById("config-message");
  if (!msg) return;
  const colors = {"success": "emerald", "error": "rose", "info": "blue"};
  const color = colors[type] || "blue";
  msg.className = "fixed top-4 right-4 bg-" + color + "-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-medium max-w-md mx-auto";
  msg.textContent = text;
  msg.style.display = "block";
  setTimeout(() => msg.style.display = "none", 4000);
}

class RepertorioApp {
  constructor() {
    this.isCordova = cordova && cordova.platformId !== 'browser';
    this.musicas = [];
    console.log("isCordova:", this.isCordova);
  }

  async init() {
    this.bindEvents();
    await window.manager.init();
    await this.loadMusicas();
    this.checkCordovaReady();
  }

  bindEvents() {
    const searchInput = document.getElementById("search-input");
    const genreSelect = document.getElementById("genre-select");
    if (searchInput) searchInput.addEventListener("input", (e) => this.filterMusicas(e.target.value));
    if (genreSelect) genreSelect.addEventListener("change", (e) => this.filterMusicas(e.target.value));
    const scanBtn = document.getElementById("scan-btn");
    if (scanBtn) scanBtn.addEventListener("click", () => this.scanPDFs());
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

  async saveMusicas(pasta) {
    const rootPasta = window.getRootPasta();
    const docs = this.musicas.map(m => ({
      _id: m._id,
      name: m.name,
      titulo: m.titulo,
      artista: m.artista || "Desconhecido",
      genero: m.genero || "Geral",
      path: m.path,
      fullPath: rootPasta + m.path,
      pasta: pasta,
      size: m.size
    }));
    await window.manager.db.bulkDocs(docs);
    console.log("Saved " + docs.length + " musicas");
  }

  async loadMusicas() {
    const files = await window.manager.readAll();
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
    const files = await window.manager.readAll();
    const grouped = files.reduce((acc, f) => {
      const pasta = f.pasta || f.fullPath ? f.fullPath.split(/[\\\\/]/)[0] || "/" : "/";
      acc[pasta] = (acc[pasta] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([caminho, total]) => ({caminho, total}));
  }

  updateGenreSelect() {
    const select = document.getElementById("genre-select");
    if (select && this.musicas.length) {
      const genres = [...new Set(this.musicas.map(m => m.genero).filter(Boolean))].sort();
      select.innerHTML = '<option value="">Todos</option>' + genres.map(g => "<option value=\"" + g + "\">" + g + "</option>").join('');
    }
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

// ConfigApp
window.ConfigApp = {
  async loadPastas() {
    const lista = document.getElementById("lista-pastas");
    if (!lista) return;
    
    lista.innerHTML = '<div class="flex items-center justify-center p-12"><span class="material-icons text-4xl mr-4 text-blue-400 animate-spin">refresh</span><span>Carregando...</span></div>';
    
    try {
      const pastas = await window.app.loadPastasFromDB();
      
      if (!pastas || pastas.length === 0) {
        lista.innerHTML = '<div class="p-12 text-center border-2 border-dashed border-gray-300 rounded-3xl bg-gradient-to-r from-gray-50 to-gray-100"><span class="material-icons text-6xl block mb-8 text-gray-400">folder_open</span><div class="text-2xl font-bold text-gray-700 mb-4">Nenhuma pasta</div><div class="text-lg text-gray-500">Clique + para adicionar</div></div>';
        return;
      }
      
      lista.innerHTML = "";
      pastas.forEach(pasta => {
        const name = pasta.caminho.split(/[\\\\/]/).pop();
        const item = document.createElement("div");
        item.className = "group flex items-center gap-4 p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl border-2 border-cyan-200 shadow-xl hover:shadow-2xl transition-all";
        item.innerHTML = `
          <div class="flex-1">
            <div class="font-bold text-xl text-gray-900 mb-1">${name}</div>
            <div class="text-xs text-gray-500">${pasta.caminho}</div>
            <div class="text-emerald-600 font-bold">${pasta.total} músicas</div>
          </div>
          <div class="flex gap-2 opacity-0 group-hover:opacity-100">
            <button onclick="ConfigApp.refreshPasta('${pasta.caminho.replace(/'/g, "\\'")}')" class="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">Refresh</button>
            <button onclick="ConfigApp.deletePasta('${pasta.caminho.replace(/'/g, "\\'")}')" class="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600">Delete</button>
          </div>
        `;
        lista.appendChild(item);
      });
    } catch(e) {
      lista.innerHTML = '<div class="p-12 text-center text-red-500"><span class="material-icons text-6xl block mb-4">error</span>Erro</div>';
    }
  },

  async refreshPasta(pastaPath) {
    showMessage("Refreshing...", "info");
    await window.app.scanPastaCompleta();
    await window.app.saveMusicas(pastaPath);
    await window.app.loadMusicas();
    this.loadPastas();
    showMessage("Concluido!", "success");
  },

  async deletePasta(pastaPath) {
    if (!confirm("Remover?")) return;
    const files = await window.manager.readAll(pastaPath);
    for (const f of files) {
      await window.manager.delete(f._id);
    }
    this.loadPastas();
    showMessage("Removido!", "success");
  },

  async adicionarPasta() {
    showMessage("Selecionando pasta...", "info");
    try {
      await window.app.scanPastaCompleta();
      const pastaPath = window.app.musicas[0] ? window.app.musicas[0].pasta : "/";
      await window.app.saveMusicas(pastaPath);
      await window.app.loadMusicas();
      this.loadPastas();
      showMessage("Pasta adicionada!", "success");
    } catch(e) {
      showMessage("Erro: " + e.message, "error");
    }
  }
};

// Init
document.addEventListener("DOMContentLoaded", async () => {
  window.app = new RepertorioApp();
  window.app.init();
window.ConfigApp = window.ConfigApp || ConfigApp;
  window.ConfigApp.loadPastas = function() { loadPastas(); };
  if (document.getElementById("selecionar-pasta")) {
    document.getElementById("selecionar-pasta").addEventListener("click", ConfigApp.adicionarPasta);
  }
// ConfigApp.loadPastas();
});
