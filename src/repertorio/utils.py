import webbrowser


def buscar_letra(titulo, artista):
    """Retorna a URL de pesquisa de letra no Google."""
    query = f"letra de música {titulo} {artista}".replace(' ', '+')
    return f"https://www.google.com/search?q={query}"


def buscar_video(titulo, artista):
    """Retorna a URL de pesquisa de vídeo no YouTube."""
    query = f"{titulo} {artista}".replace(' ', '+')
    return f"https://www.youtube.com/results?search_query={query}"

# A função editar_arquivo não será mais usada no contexto web.
# Se quiser manter, pode retornar uma URL para download ou edição online,
# mas por enquanto vamos removê-la.
