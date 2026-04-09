import json
import os
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')


class ConfigManager:
    def __init__(self, app_name='repertorio', config_file='config.json', config_dir=None):
        if config_dir is None:
            self.config_dir = os.path.expanduser(f'~/.config/{app_name}')
        else:
            self.config_dir = config_dir
        self.config_path = os.path.join(self.config_dir, config_file)
        self.config = self._load()

    def _ensure_config_dir(self):
        Path(self.config_dir).mkdir(parents=True, exist_ok=True)

    def _load(self):
        default_config = {
            'root_path': '',          # mantido para compatibilidade
            'root_paths': []           # nova lista de pastas
        }

        if not os.path.exists(self.config_path):
            logging.info(
                "Arquivo de configuração não encontrado. Usando configuração padrão.")
            return default_config

        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                conteudo = f.read().strip()
                if not conteudo:
                    logging.warning(
                        "Arquivo de configuração vazio. Usando padrão.")
                    return default_config
                config = json.loads(conteudo)
                # Garantir que as chaves existam
                if 'root_path' not in config:
                    config['root_path'] = ''
                if 'root_paths' not in config:
                    config['root_paths'] = []
                return config
        except (json.JSONDecodeError, IOError) as e:
            logging.error(
                f"Erro ao ler arquivo de configuração: {e}. Usando padrão.")
            return default_config

    def save(self):
        self._ensure_config_dir()
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
            logging.info("Configurações salvas com sucesso.")
        except IOError as e:
            logging.error(f"Erro ao salvar configurações: {e}")

    def get(self, key, default=None):
        return self.config.get(key, default)

    def set(self, key, value):
        self.config[key] = value
        self.save()

    def update(self, new_config):
        self.config.update(new_config)
        self.save()
