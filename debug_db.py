import os
import sqlite3

# Possíveis locais do banco
possiveis_caminhos = [
    os.path.join(os.path.dirname(__file__), 'instance', 'repertorio.db'),
    os.path.expanduser('~/srf/repertorio/repertorio.db'),
    os.path.expanduser('~/Aplicativos/repertorio/instance/repertorio.db'),
    os.path.join(os.path.dirname(__file__), 'src',
                 'repertorio', 'repertorio.db'),
]

print("Procurando banco de dados...")
for caminho in possiveis_caminhos:
    if os.path.exists(caminho):
        print(f"\n✅ Banco encontrado em: {caminho}")
        try:
            conn = sqlite3.connect(caminho)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM musicas")
            count = cursor.fetchone()[0]
            print(f"📊 Total de músicas: {count}")
            if count > 0:
                cursor.execute(
                    "SELECT genero, artista, titulo FROM musicas LIMIT 5")
                print("📝 Primeiras 5 músicas:")
                for row in cursor.fetchall():
                    print(
                        f"   {row[0]} | {row[1] or '(sem artista)'} | {row[2]}")
            conn.close()
        except Exception as e:
            print(f"❌ Erro ao ler banco: {e}")
        break
else:
    print("❌ Nenhum banco encontrado nos locais testados.")
