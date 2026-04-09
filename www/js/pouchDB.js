"use strict";

/**
 * PouchDBManager - CRUD + utilitários para PDFs
 */
// js/pouchDB.js
// Não sobrescreve PouchDB se já estiver definido (ex.: CDN carregado)
(function () {
  if (typeof window.PouchDB === 'undefined') {
    console.warn('PouchDB não encontrado globalmente. Certifique-se de que o CDN foi carregado antes deste arquivo.');
    // Não tentamos carregar nada automaticamente aqui; o CDN em config.html já foi incluído.
    return;
  }

  // Inicializador leve: cria db padrão se não existir
  if (!window.__repertorio_db_initialized) {
    try {
      window.__repertorio_db = window.__repertorio_db || new PouchDB('repertorio');
      window.__repertorio_db_initialized = true;
      // expõe db via window.app.db se app existir
      if (window.app && !window.app.db) {
        window.app.db = window.__repertorio_db;
      }
    } catch (e) {
      console.error('Erro ao inicializar PouchDB local:', e);
    }
  }
})();

  if (!window.__repertorio_db_initialized) {
    try {
      window.__repertorio_db = window.__repertorio_db || new PouchDB('repertorio');
      window.__repertorio_db_initialized = true;
      // expõe db via window.app.db se app existir
      if (window.app && !window.app.db) {
        window.app.db = window.__repertorio_db;
      }
      // expõe db padrão global para PouchDBManager usar por default
      window.__repertorio_default_db = window.__repertorio_db;
    } catch (e) {
      console.error('Erro ao inicializar PouchDB local:', e);
    }
  }


class PouchDBManager {
  constructor(dbName = 'repertorio_musicas') {
    this.dbName = dbName;
    this.db = null;
    this.cachedFiles = [];
    this.syncHandler = null;
  }

  async init() {
    if (typeof PouchDB === 'undefined') {
      throw new Error('PouchDB não carregado');
    }
this.db = this.db || (window.__repertorio_default_db ? window.__repertorio_default_db : new PouchDB(this.dbName));
    await this.loadData();
    return this;
  }

  async loadData() {
    try {
      const result = await this.db.allDocs({ include_docs: true });
      this.cachedFiles = result.rows.map(r => r.doc);
      return this.cachedFiles;
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      throw err;
    }
  }

  async readAll(query = '') {
    try {
      const result = await this.db.allDocs({ include_docs: true });
      let files = result.rows.map(r => r.doc);
      if (query) {
        files = files.filter(f =>
          (f.pasta || '').includes(query) ||
          (f.titulo || '').toLowerCase().includes(query.toLowerCase()) ||
          (f.artista || '').toLowerCase().includes(query.toLowerCase())
        );
      }
      this.cachedFiles = files;
      return files;
    } catch (err) {
      console.error('Erro ao ler dados:', err);
      throw err;
    }
  }

  async read(id) {
    return await this.db.get(id);
  }

  async update(id, updates) {
    const doc = await this.db.get(id);
    const updatedDoc = { ...doc, ...updates };
    const response = await this.db.put(updatedDoc);
    await this.loadData();
    return response;
  }

  async delete(id) {
    const doc = await this.db.get(id);
    const response = await this.db.remove(doc);
    await this.loadData();
    return response;
  }

  async deleteAll() {
    await this.db.destroy();
    this.cachedFiles = [];
    await this.init();
  }

  async bulkDocs(docs) {
    const result = await this.db.bulkDocs(docs);
    await this.loadData();
    return result;
  }

  async createFromFolder() {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API não suportada');
    }
    const dirHandle = await window.showDirectoryPicker();
    const list = [];
    await this.scanDir(dirHandle, dirHandle.name, list);
    await this.db.bulkDocs(list);
    await this.loadData();
    return list;
  }

  async scanDir(handle, path, list) {
    // handle é um FileSystemDirectoryHandle
    for await (const [name, entry] of handle.entries()) {
      const fullPath = `${path}/${name}`;
      if (entry.kind === 'directory') {
        await this.scanDir(entry, fullPath, list);
      } else if (entry.kind === 'file' && name.toLowerCase().endsWith('.pdf')) {
        try {
          const file = await entry.getFile();
          const id = Date.now() + Math.random().toString(36).substr(2, 9);
          const cleanName = name.replace(/\.pdf$/i, '').trim();
          const dashIndex = cleanName.lastIndexOf(' - ');
          const parts = dashIndex > 0
            ? [cleanName.slice(0, dashIndex), cleanName.slice(dashIndex + 3)]
            : ['Desconhecido', cleanName];
          list.push({
            _id: id,
            name: name,
            titulo: parts[1] || cleanName,
            artista: parts[0],
            genero: 'Geral',
            path: path,           // pasta relativa onde o arquivo foi encontrado
            fullPath: fullPath,   // caminho completo relativo à raiz passada
            size: `${(file.size / 1024).toFixed(2)} KB`,
            lastModified: file.lastModified || Date.now()
          });
        } catch (err) {
          console.warn('Erro ao ler arquivo durante scanDir', name, err);
        }
      }
    }
  }


  exportPDF(files = this.cachedFiles, filename = `lista_${Date.now()}.pdf`) {
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF não carregado');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Relatório de Arquivos PDF', 14, 20);
    const tableData = files.map(f => [f.name, f.genero, f.artista, f.path, f.size]);
    doc.autoTable({
      startY: 30,
      head: [['Nome', 'Gênero', 'Artista', 'Caminho', 'Tamanho']],
      body: tableData,
      theme: 'grid'
    });
    doc.save(filename);
  }

  syncRemote(remoteURL) {
    if (this.syncHandler) {
      this.syncHandler.cancel();
    }
    this.syncHandler = this.db.sync(remoteURL, { live: true, retry: true })
      .on('change', info => console.log('Sync change:', info))
      .on('paused', err => console.log('Sync paused:', err))
      .on('active', () => console.log('Sync active'))
      .on('error', err => console.error('Sync error:', err));
    return this.syncHandler;
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


  
}

// Exporta globalmente
window.PouchDBManager = PouchDBManager;
console.log('PouchDBManager carregado com sucesso.');
