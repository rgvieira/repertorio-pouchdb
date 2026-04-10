// 1. Detecta se é Electron de verdade
const isElectron = (typeof process !== 'undefined' && process.versions && !!process.versions.electron);

if (isElectron) {
    // Se for Electron, usa o require real do sistema
    window.remoteRequire = window.require;
    console.log("🚀 Modo Desktop: Acesso total ao sistema liberado.");
} else {
    // Se for Navegador, cria o "fake" para não dar erro de função inexistente
    console.warn("🌐 Modo Web: Acesso ao sistema bloqueado pelo navegador.");
    window.remoteRequire = function(module) {
        return { 
            readdirSync: () => [], 
            existsSync: () => false,
            join: (...args) => args.join('/'),
            dirname: (p) => p.substring(0, p.lastIndexOf('/')),
            sep: "/"
        };
    };
}
// Definimos a variável, mas não a inicializamos imediatamente.
// Precisamos garantir que o plugin 'find' seja registrado ANTES de 'new PouchDB'.
let db = null;

const DBManager = {
    async init() {
        try {
            // 1. Registro do Plugin: Tenta detectar o plugin find se ele não estiver no protótipo
            if (typeof PouchDB !== 'undefined' && !PouchDB.prototype.createIndex) {
                const findPlugin = window.PouchDBFind || window['pouchdb-find'];
                if (findPlugin) {
                    PouchDB.plugin(findPlugin);
                    console.log("Plugin PouchDB Find registrado manualmente.");
                } 
            }

            // 2. Inicialização da Instância única (usando o nome consistente 'repertorio')
            if (!db) {
                db = new PouchDB('repertorio', {
                    auto_compaction: true,
                    adapter: 'idb'
                });
            }

            // 3. Criação de índices para otimizar as buscas
            if (typeof db.createIndex === 'function') {
                await db.createIndex({
                    index: { fields: ['tipo', 'genero', 'artista', 'titulo'] }
                });
                console.log("Banco de dados PouchDB e índices inicializados com sucesso.");
            } else {
                console.warn("Aviso: createIndex não disponível. O plugin 'pouchdb.find' não foi carregado corretamente.");
            }
        } catch (err) {
            console.error("Erro crítico ao inicializar PouchDB:", err);
        }
    },


    // --- Gerenciamento de Pastas ---
    async addFolder(path) {
        // ID seguro: removemos caracteres que o PouchDB/URL não gostam
        const safeId = btoa(unescape(encodeURIComponent(path))).replace(/[/=+]/g, '');
        
        const folderDoc = {
            _id: 'folder_' + safeId,
            type: 'folder',
            path: path,
            data_criacao: new Date().toISOString()
        };

        try {
            await db.put(folderDoc);
            return true;
        } catch (err) {
            if (err.name === 'conflict') return false;
            throw err;
        }
    },

    async listFolders() {
        try {
            const result = await db.find({
                selector: { type: 'folder' }
            });
            return result.docs;
        } catch (err) {
            console.error("Erro ao listar pastas:", err);
            return [];
        }
    },

    async deleteFolder(folderId) {
        try {
            const doc = await db.get(folderId);
            // Antes de deletar a pasta, limpamos as músicas que pertencem a ela
            await this.limparMusicasDaPasta(doc.path);
            await db.remove(doc);
        } catch (err) {
            console.error("Erro ao deletar pasta:", err);
        }
    },

    async contarMusicasNaPasta(folderPath) {
        try {
            // Como o _id é o próprio caminho, usamos prefix search (mais rápido que regex)
            const result = await db.allDocs({
                startkey: folderPath,
                endkey: folderPath + '\uffff'
            });
            return result.rows.length;
        } catch (err) {
            return 0;
        }
    },

    async limparMusicasDaPasta(folderPath) {
        try {
            // Normaliza para barras / para bater com o que foi salvo no banco (webPath)
            const normalizedPath = folderPath.replace(/\\/g, '/');
            const result = await db.allDocs({
                startkey: normalizedPath,
                endkey: normalizedPath + '\uffff',
                include_docs: true
            });

            const musicasDaPasta = result.rows.filter(r => r.doc && r.doc.tipo === 'musica');
            if (musicasDaPasta.length > 0) {
                const deletions = musicasDaPasta.map(row => ({ ...row.doc, _deleted: true }));
                await db.bulkDocs(deletions);
                console.log(`${deletions.length} músicas removidas da pasta: ${normalizedPath}`);
            }
        } catch (err) {
            console.error("Erro ao limpar músicas por caminho:", err);
        }
    },

    // ATENÇÃO: Use sempre 'async', 'sync' não existe no JS para declarar funções
    async inserirMusica(musica) {
        console.log("DBManager -> Recebendo música para inserir:", musica.titulo);
        const doc = {
            _id: musica.caminho, // O caminho é a chave primária única
            genero: musica.genero || 'Desconhecido',
            artista: musica.artista || 'Artista Desconhecido',
            titulo: musica.titulo || 'Sem Título',
            fullPath: musica.caminho,
            favorito: 0,
            tipo: 'musica'
        };

        try {
            // Tenta inserir. Se já existir, pegamos o _rev para atualizar ou ignorar
            await db.put(doc);
        } catch (err) {
            if (err.name === 'conflict') {
                // Se houver conflito, opcionalmente você pode atualizar o registro existente
                // const existing = await db.get(musica.caminho);
                // doc._rev = existing._rev;
                // await db.put(doc);
            } else {
                throw err;
            }
        }
    },

    async listarMusicas(filtro = "", genero = "") {
        try {
            let selector = { tipo: 'musica' };
            if (genero) selector.genero = genero;
            
            const result = await db.find({ selector });
            let musicas = result.docs;

            if (filtro) {
                const f = filtro.toLowerCase();
                musicas = musicas.filter(m => 
                    (m.titulo && m.titulo.toLowerCase().includes(f)) || 
                    (m.artista && m.artista.toLowerCase().includes(f))
                );
            }
            return musicas;
        } catch (err) {
            console.error("Erro ao listar músicas:", err);
            return [];
        }
    },

    async limparBanco() {
        try {
            const result = await db.find({ selector: { tipo: 'musica' } });
            if (result.docs.length > 0) {
                const deletions = result.docs.map(doc => ({ ...doc, _deleted: true }));
                await db.bulkDocs(deletions);
                return true;
            }
        } catch (err) {
            console.error("Erro ao limpar banco:", err);
        }
        return false;
    },
};

// Expor globalmente para garantir visibilidade entre scripts
window.DBManager = DBManager;