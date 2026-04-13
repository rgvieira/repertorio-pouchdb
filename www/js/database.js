/**
 * js/database.js - Completo e Sem Cortes
 */
var db = null;

const DBManager = {
    async init() {
        console.log("DBManager: Iniciando...");
        
        // Espera o PouchDB carregar (Proteção Android)
        const wait = (ms) => new Promise(res => setTimeout(res, ms));
        for (let i = 0; i < 15; i++) {
            if (typeof PouchDB !== 'undefined') break;
            await wait(200);
        }

        if (typeof PouchDB === 'undefined') return false;

        try {
            // Registro do Plugin Find
            if (!PouchDB.prototype.find) {
                const plugin = window.PouchDBFind || window['pouchdb-find'];
                if (plugin) PouchDB.plugin(plugin);
            }

            if (!db) {
                db = new PouchDB('repertorio', { auto_compaction: true, adapter: 'idb' });
            }

            // Índices para busca
            await db.createIndex({ index: { fields: ['tipo', 'pasta', 'nome'] } });
            await db.createIndex({ index: { fields: ['type'] } });

            window.db = db; // Expõe para o resto do sistema
            console.log("✅ DBManager: Banco Pronto");
            return true;
        } catch (err) {
            console.error("Erro no DBManager:", err);
            return false;
        }
    },

    async inserirMusica(musica) {
        if (!db) return;
        const doc = {
            _id: musica._id, // O CAMINHO REAL É O ID
            nome: musica.nome,
            pasta: musica.pasta,
            tipo: 'musica',
            _attachments: musica._attachments || null
        };
        try {
            const ext = await db.get(doc._id).catch(() => null);
            if (ext) doc._rev = ext._rev;
            await db.put(doc);
        } catch (e) { console.error(e); }
    },

    async listarMusicas(filtro = "", pasta = "") {
        if (!db) return [];
        try {
            let selector = { tipo: 'musica' };
            if (pasta) selector.pasta = pasta;
            const res = await db.find({ selector });
            let docs = res.docs;
            if (filtro) {
                const f = filtro.toLowerCase();
                docs = docs.filter(m => m.nome.toLowerCase().includes(f));
            }
            return docs;
        } catch (e) { return []; }
    },

    async addFolder(path) {
        if (!db) return;
        const safeId = 'folder_' + btoa(path).replace(/[/=+]/g, '');
        try {
            await db.put({ _id: safeId, type: 'folder', path: path });
            return true;
        } catch (e) { return false; }
    },

    async listFolders() {
        if (!db) return [];
        try {
            const res = await db.find({ selector: { type: 'folder' } });
            return res.docs;
        } catch (e) { return []; }
    },

    async limparBanco() {
        if (!db) return;
        try {
            const res = await db.allDocs({ include_docs: true });
            const del = res.rows
                .filter(r => !r.id.startsWith('_design/'))
                .map(r => ({ _id: r.id, _rev: r.doc._rev, _deleted: true }));
            await db.bulkDocs(del);
            return true;
        } catch (e) { return false; }
    }
};
window.DBManager = DBManager;