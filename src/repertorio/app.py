"""
O Repertório é um banco de partituras em PDF armazenadas no próprio celular. As pastas são organizadas por gênero musical, com subpastas por artista e seus respectivos arquivos. Permite visualizar e editar partituras de forma prática e rápida.
"""

import threading
import toga
from toga import dialogs

_toga_app = None


def get_toga_app():
    return _toga_app


class Repertório(toga.App):
    def startup(self):
        global _toga_app
        _toga_app = self

        # Inicia o servidor Flask em background (código existente)
        import threading

        def run_flask():
            from .flask_app import app
            app.run(host='127.0.0.1', port=5000,
                    debug=False, use_reloader=False)
        threading.Thread(target=run_flask, daemon=True).start()

        # Cria a janela com WebView (código existente)
        self.main_window = toga.MainWindow(title=self.formal_name)
        webview = toga.WebView(url='http://127.0.0.1:5000')
        self.main_window.content = webview
        self.main_window.show()


def main():
    return Repertório()
