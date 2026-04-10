// Utils for config.html - Pasta Raiz localStorage
window.getRootPasta = () => localStorage.getItem('rootPasta') || '';

window.setRootPasta = (path) => {
  localStorage.setItem('rootPasta', path);
  console.log('Root pasta set:', path);
};

window.getFullPath = (relativePath) => {
  const root = window.getRootPasta();
  if (root && relativePath.startsWith('./')) {
    return root + relativePath.slice(1);
  }
  return relativePath;
};

window.scanWithRoot = async () => {
  const root = window.getRootPasta();
  if (!root) {
    showMessage('Defina pasta raiz primeiro!', 'error');
    return null;
  }
  // Mock scan or use file input
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.onchange = (e) => {
    const musicas = [];
    for (let file of e.target.files) {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const name = file.name.replace('.pdf', '').trim();
        const dash = name.lastIndexOf(' - ');
        const parts = dash > 0 ? [name.slice(0, dash), name.slice(dash + 3)] : ['Desconhecido', name];
        musicas.push({
          _id: Date.now() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          titulo: parts[1] || name,
          artista: parts[0],
          genero: 'Geral',
          path: file.webkitRelativePath,
          fullPath: window.getFullPath(file.webkitRelativePath),
          pasta: root,
          size: Math.round(file.size / 1024) + ' KB'
        });
      }
    }
    window.app.musicas = musicas;
    window.app.saveMusicas(root);
    ConfigApp.loadPastas();
    showMessage(musicas.length + ' músicas salvas!', 'success');
  };
  input.click();
};

