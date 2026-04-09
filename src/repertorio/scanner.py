import os
from .database import limpar_tabela, inserir_musica

EXTENSOES = ('.pdf', '.mscz', '.mxl', '.musicxml', '.ly', '.txt')
# pastas que não devem ser tratadas como artista
IGNORAR_PASTAS = {'Validar', 'Visto'}


def escanear_pasta(root_path, clear=True):
    """
    Escaneia qualquer estrutura:
      - Gênero/arquivo.pdf  (artista vazio)
      - Gênero/Artista/arquivo.pdf
      - Ignora subpastas listadas em IGNORAR_PASTAS
    Retorna número total de arquivos inseridos.
    """
    if not os.path.isdir(root_path):
        print(f"[ERRO] Pasta não encontrada: {root_path}")
        return 0

    if clear:
        limpar_tabela()
        print("[INFO] Tabela limpa")

    total = 0

    for item in os.listdir(root_path):
        caminho_item = os.path.join(root_path, item)

        # Ignorar arquivos na raiz (raiz deve conter apenas pastas de gênero)
        if os.path.isfile(caminho_item):
            continue

        if os.path.isdir(caminho_item):
            genero = item
            genero_path = caminho_item

            # Processa arquivos diretamente na pasta do gênero (artista vazio)
            for arquivo in os.listdir(genero_path):
                caminho_arquivo = os.path.join(genero_path, arquivo)
                if os.path.isfile(caminho_arquivo) and any(
                    arquivo.lower().endswith(ext) for ext in EXTENSOES
                ):
                    titulo = os.path.splitext(arquivo)[0]
                    inserir_musica(genero, "", titulo, caminho_arquivo)
                    total += 1
                    print(f"[SCANNER] {genero}/ (sem artista) {arquivo}")

            # Processa subpastas dentro do gênero (artistas)
            for subitem in os.listdir(genero_path):
                subcaminho = os.path.join(genero_path, subitem)
                if os.path.isdir(subcaminho):
                    artista = subitem
                    # Ignorar pastas indesejadas
                    if artista in IGNORAR_PASTAS:
                        print(f"[SCANNER] Ignorando pasta: {genero}/{artista}")
                        continue
                    artista_path = subcaminho
                    for arquivo in os.listdir(artista_path):
                        caminho_arquivo = os.path.join(artista_path, arquivo)
                        if os.path.isfile(caminho_arquivo) and any(
                            arquivo.lower().endswith(ext) for ext in EXTENSOES
                        ):
                            titulo = os.path.splitext(arquivo)[0]
                            inserir_musica(genero, artista,
                                           titulo, caminho_arquivo)
                            total += 1
                            print(f"[SCANNER] {genero}/{artista}/{arquivo}")

    print(f"[SCANNER] TOTAL DE ARQUIVOS INSERIDOS: {total}")
    return total
