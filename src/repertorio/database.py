import os
import sqlite3
from flask import current_app

_DB_PATH = None


def set_db_path(path):
    global _DB_PATH
    _DB_PATH = path


def get_db_path():
    if _DB_PATH:
        return _DB_PATH
    # Fallback para desenvolvimento (caso execute fora do Flask)
    return os.path.join(os.path.dirname(__file__), 'repertorio.db')


def init_db():
    """Cria as tabelas se não existirem."""
    db_path = get_db_path()
    print(f"[DB] Inicializando banco em: {db_path}")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Cria tabela musicas
    c.execute('''
        CREATE TABLE IF NOT EXISTS musicas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            genero TEXT,
            artista TEXT,
            titulo TEXT,
            caminho TEXT UNIQUE,
            favorito INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    print("[DB] Tabela 'musicas' criada/verificada.")

    # Cria e popula tabela genero
    criar_tabela_genero()
    criar_tabela_anotacoes()
    conn.close()
    print("[DB] Inicialização concluída.")


def criar_tabela_genero():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS genero (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL
        )
    """)
    # Popula com gêneros distintos da tabela musicas
    cursor.execute("""
        INSERT OR IGNORE INTO genero (nome)
        SELECT DISTINCT genero FROM musicas WHERE genero IS NOT NULL AND genero != ''
    """)
    conn.commit()
    conn.close()
    print("[DB] Tabela 'genero' sincronizada.")


def listar_generos():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT nome FROM genero ORDER BY nome")
    generos = [row[0] for row in cursor.fetchall()]
    conn.close()
    return generos


def listar_musicas(filtro: str = "", genero: str = "", favoritos: bool = False):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    query = 'SELECT genero, artista, titulo, caminho FROM musicas'
    conditions = []
    params = []

    if favoritos:
        conditions.append('favorito = 1')
    if filtro:
        conditions.append('(genero LIKE ? OR artista LIKE ? OR titulo LIKE ?)')
        params.extend([f'%{filtro}%'] * 3)
    if genero:
        conditions.append('genero = ?')
        params.append(genero)

    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
    query += ' ORDER BY genero, artista, titulo'

    c.execute(query, params)
    resultados = c.fetchall()
    conn.close()
    return resultados


def inserir_musica(genero, artista, titulo, caminho):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    try:
        c.execute('''
            INSERT OR IGNORE INTO musicas (genero, artista, titulo, caminho)
            VALUES (?, ?, ?, ?)
        ''', (genero, artista, titulo, caminho))
        conn.commit()
    except Exception as e:
        print(f"[DB] Erro ao inserir {caminho}: {e}")
    finally:
        conn.close()


def limpar_tabela():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('DELETE FROM musicas')
    conn.commit()
    conn.close()
    print("[DB] Tabela 'musicas' limpa.")


def marcar_favorito(caminho, valor):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('UPDATE musicas SET favorito = ? WHERE caminho = ?',
              (valor, caminho))
    conn.commit()
    conn.close()


def criar_tabela_anotacoes():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS anotacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            arquivo TEXT,
            page INTEGER,
            tipo TEXT,
            cor TEXT,
            pontos TEXT  -- JSON com array de pontos
        )
    ''')
    conn.commit()
    conn.close()
    print("[DB] Tabela 'anotacoes' criada/verificada.")

