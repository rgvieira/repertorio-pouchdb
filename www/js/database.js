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
    console.log('🔍 inserirMusica chamada com:', musica);
    console.log('🔍 musica._id =', musica._id);
    console.log('🔍 musica.path =', musica.path);
    
    try {
        if (!musica._id) {
            console.warn('⚠️ _id faltando! Gerando de path:', musica.path);
            musica._id = musica.path || Date.now().toString();
        }
        
        musica.nome = musica.nome || 'Sem nome';
        musica.pasta = musica.pasta || 'Outros';
        musica.path = musica.path || musica._id;
        musica.tipo = musica.tipo || 'musica';
        musica.dataInsercao = musica.dataInsercao || new Date().toISOString();
        
        console.log('💾 Salvando:', musica._id);
        const doc = await db.put(musica);
        console.log('✅ Salvo:', doc.id);
        return true;
    } catch (e) {
        console.error('❌ Erro detalhado:', {
            nome: e.name,
            msg: e.message,
            Musica: musica
        });
        return false;
    }
} ,

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

async addFolder(uri) {
    const folderName = getFolderNameFromUri(uri);
    
    if (!db) return false;
    
    try {
        const existing = await db.find({ 
            selector: { 
                type: 'folder',
                path: uri
            }
        });
        
        if (existing.docs.length > 0) {
            console.log('✅ Pasta já existe:', folderName);
            return true;
        }
        
        const doc = {
            _id: uri,
            type: 'folder',
            path: uri,
            name: folderName,
            created: new Date().toISOString()
        };
        
        await db.put(doc);
        return true;
    } catch (e) {
        console.error('Erro ao salvar pasta:', e);
        return false;
    }
},

async listFolders() {
    if (!db) return [];
    try {
        const res = await db.find({ selector: { type: 'folder' } }); 
        return res.docs;
    } catch (e) { return []; }
},
async deleteFolder(id) {
    if (!db) return false;
    try {
        const folder = await db.get(id);
        await db.remove(folder);
        return true;
    } catch (e) { 
        console.error('Erro ao deletar pasta:', e);
        return false; 
    }
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