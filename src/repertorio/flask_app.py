import os
import json
import asyncio
from flask import (
    Flask, request, render_template, jsonify, send_file, redirect, abort
)
from werkzeug.utils import secure_filename
from . import database as db
from .config import ConfigManager
from . import scanner
from . import utils
from .app import get_toga_app  # importa a função que retorna a instância do Toga
import toga
from .app import get_toga_app

app = Flask(__name__, static_folder='static')

print(
    f"[DEBUG] Caminho absoluto da pasta estática: {os.path.abspath(app.static_folder)}")
print(f"[DEBUG] A pasta estática existe? {os.path.exists(app.static_folder)}")
print(
    f"[DEBUG] O arquivo sw.js existe? {os.path.exists(os.path.join(app.static_folder, 'sw.js'))}")
# Garante que o diretório de instância existe
try:
    os.makedirs(app.instance_path, exist_ok=True)
except OSError:
    pass

DB_PATH = os.path.join(app.instance_path, 'repertorio.db')

ANOTACOES_DIR = os.path.join(app.instance_path, 'anotacoes')
print(f"[DEBUG] Banco de dados em: {DB_PATH}")
print(f"[DEBUG] Diretório de anotações: {ANOTACOES_DIR}")
os.makedirs(ANOTACOES_DIR, exist_ok=True)

db.set_db_path(DB_PATH)
db.init_db()

config_manager = ConfigManager(config_dir=app.instance_path)

# ----------------------------------------------------------------------
# Rotas existentes (já estavam aqui)
# ----------------------------------------------------------------------


@app.route('/sw.js')
def serve_sw():
    try:
        return app.send_static_file('sw.js')
    except Exception as e:
        print(f"[ERRO] Não foi possível servir sw.js: {e}")
        abort(404)


@app.route('/')
def index():
    busca = request.args.get('busca', '')
    genero = request.args.get('genero', '')
    generos = db.listar_generos()
    if not genero and generos:
        genero = generos[0]
    musicas = db.listar_musicas(filtro=busca, genero=genero)
    print(f"[INDEX] Número de músicas retornadas do banco: {len(musicas)}")
    return render_template('index.html',
                           musicas=musicas,
                           busca=busca,
                           generos=generos,
                           genero_selecionado=genero)


@app.route('/anotacoes/<path:arquivo>')
def get_anotacoes(arquivo):
    nome_base = os.path.basename(arquivo)
    nome_anotacoes = secure_filename(nome_base) + '.json'
    caminho_anotacoes = os.path.join(ANOTACOES_DIR, nome_anotacoes)
    try:
        with open(caminho_anotacoes, 'r', encoding='utf-8') as f:
            anotacoes = json.load(f)
        return jsonify(anotacoes)
    except FileNotFoundError:
        return jsonify([])
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@app.route('/salvar_anotacoes', methods=['POST'])
def salvar_anotacoes():
    dados = request.get_json()
    if not dados:
        return jsonify({'erro': 'Requisição inválida'}), 400
    arquivo = dados.get('arquivo')
    anotacoes = dados.get('anotacoes', [])
    if not arquivo:
        return jsonify({'erro': 'Arquivo não especificado'}), 400

    nome_base = os.path.basename(arquivo)
    nome_anotacoes = secure_filename(nome_base) + '.json'
    caminho_anotacoes = os.path.join(ANOTACOES_DIR, nome_anotacoes)
    try:
        with open(caminho_anotacoes, 'w', encoding='utf-8') as f:
            json.dump(anotacoes, f)
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@app.route('/pdf/<path:caminho>')
def visualizar_pdf(caminho):
    import urllib.parse
    caminho_real = urllib.parse.unquote(caminho)
    root_paths = config_manager.get('root_paths', [])
    permitido = False
    for pasta in root_paths:
        if os.path.commonpath([os.path.abspath(pasta), os.path.abspath(caminho_real)]) == os.path.abspath(pasta):
            permitido = True
            break
    if not permitido:
        abort(403, description='Acesso negado')
    if not os.path.exists(caminho_real):
        abort(404, description='Arquivo não encontrado')
    return send_file(caminho_real)


@app.route('/viewer')
def viewer():
    arquivo = request.args.get('arquivo', '')
    titulo = request.args.get('titulo', '')
    nome_arquivo = os.path.basename(arquivo)
    return render_template('viewer.html',
                           arquivo=arquivo,
                           titulo=titulo,
                           nome_arquivo=nome_arquivo)


@app.route('/config')
def config_page():
    root_paths = config_manager.get('root_paths', [])
    return render_template('config.html', root_paths=root_paths)


@app.route('/config/salvar', methods=['POST'])
def config_salvar():
    root_paths = request.form.getlist('root_paths')
    print(f"[DEBUG] Pastas recebidas: {root_paths}")
    pastas_validas = [p for p in root_paths if p and os.path.isdir(p)]
    print(f"[DEBUG] Pastas válidas: {pastas_validas}")
    config_manager.set('root_paths', pastas_validas)
    return '<div class="mensagem sucesso">Pastas salvas com sucesso!</div>'


@app.route('/config/reescanear', methods=['POST'])
def config_reescanear():
    root_paths = config_manager.get('root_paths', [])
    if not root_paths:
        return '<div class="mensagem erro">Nenhuma pasta definida.</div>'

    # Limpa a tabela uma única vez
    try:
        db.limpar_tabela()
        print("[DEBUG] Tabela limpa com sucesso")
    except Exception as e:
        print(f"[ERRO] Falha ao limpar tabela: {e}")
        return f'<div class="mensagem erro">Erro ao limpar banco: {e}</div>'

    erros = []
    for pasta in root_paths:
        try:
            print(f"[DEBUG] Escaneando pasta: {pasta}")
            resultado = scanner.escanear_pasta(
                pasta, clear=False)  # não limpa novamente

            print(f"[DEBUG] Pasta {pasta} retornou {resultado} arquivos")
            if not resultado:
                erros.append(f"{pasta}: pasta não encontrada ou vazia")
            else:
                print(f"[DEBUG] Pasta {pasta} escaneada com sucesso")
        except Exception as e:
            import traceback
            traceback.print_exc()
            erros.append(f"{pasta}: {e}")

    if erros:
        return f'<div class="mensagem erro">Erros: {"; ".join(erros)}</div>'
    else:
        return '<div class="mensagem sucesso">Reescaneamento concluído!</div>'


@app.route('/config/upload', methods=['POST'])
def config_upload():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'Nenhum arquivo enviado'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'Nome de arquivo vazio'}), 400
    temp_path = os.path.join(app.instance_path, secure_filename(file.filename))
    file.save(temp_path)
    pasta_raiz = os.path.dirname(temp_path)
    os.remove(temp_path)

    root_paths = config_manager.get('root_paths', [])
    if pasta_raiz not in root_paths:
        root_paths.append(pasta_raiz)
        config_manager.set('root_paths', root_paths)

    try:
        scanner.escanear_pasta(pasta_raiz)
        return jsonify({'status': 'ok', 'message': f'Pasta adicionada: {pasta_raiz}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/letra')
def letra():
    titulo = request.args.get('titulo', '')
    artista = request.args.get('artista', '')
    url = utils.buscar_letra(titulo, artista)
    return redirect(url)


@app.route('/video')
def video():
    titulo = request.args.get('titulo', '')
    artista = request.args.get('artista', '')
    url = utils.buscar_video(titulo, artista)
    return redirect(url)


@app.route('/download/<path:caminho>')
def download_arquivo(caminho):
    import urllib.parse
    caminho_real = urllib.parse.unquote(caminho)
    if not os.path.exists(caminho_real):
        abort(404, description='Arquivo não encontrado')
    return send_file(caminho_real, as_attachment=True, download_name=os.path.basename(caminho_real))


# ----------------------------------------------------------------------
# NOVA ROTA: /config/picker (seletor de pasta via Toga)
# ----------------------------------------------------------------------


@app.route('/config/picker', methods=['GET'])
def config_picker():
    app_toga = get_toga_app()
    if app_toga is None:
        return jsonify({'error': 'Aplicativo Toga não inicializado'}), 500

    # Usa o loop de eventos do Toga (já rodando na thread principal)
    loop = app_toga.loop
    future = asyncio.run_coroutine_threadsafe(
        _open_folder_dialog(app_toga), loop)

    try:
        path = future.result(timeout=60)  # aguarda até 60s
        if path:
            return jsonify({'path': path})
        else:
            return jsonify({'cancelled': True})
    except asyncio.TimeoutError:
        return jsonify({'error': 'Tempo limite excedido'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


async def _open_folder_dialog(app):
    try:
        print("[DEBUG] Antes de criar o diálogo")
        dialog = toga.SelectFolderDialog("Selecione a pasta de músicas")
        print("[DEBUG] Diálogo criado, chamando app.dialog...")
        result = await app.dialog(dialog)
        print(f"[DEBUG] Resultado do diálogo: {result}")
        return str(result) if result else None
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Flask] Erro no seletor: {e}")
        return None
