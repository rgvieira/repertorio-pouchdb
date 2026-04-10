
window.pastas = JSON.parse(localStorage.getItem('repertorioPastas') || '[]');

function savePastas() {
  localStorage.setItem('repertorioPastas', JSON.stringify(window.pastas));
}

function loadPastas() {
  const lista = document.getElementById('lista-pastas');
  lista.innerHTML = '';
  if (window.pastas.length === 0) {
    lista.innerHTML = '<div class="p-12 text-center text-gray-500">Nenhuma pasta</div>';
    return;
  }
  window.pastas.forEach((pasta, index) => {
    const card = document.createElement('div');
    card.className = 'flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 mb-4';
    card.innerHTML = `
      <div>
        <div class="font-bold text-lg">${pasta.name}</div>
        <div class="text-sm text-gray-600">${pasta.path}</div>
      </div>
      <div class="flex gap-2">
        <button onclick="refreshPasta(${index})" class="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">Refresh</button>
        <button onclick="deletePasta(${index})" class="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600">Delete</button>
      </div>
    `;
    lista.appendChild(card);
  });
}

function refreshPasta(index) {
  const pasta = window.pastas[index];
  showMessage('Refresh ' + pasta.name, 'info');
  // Scan logic here
}

function deletePasta(index) {
  if (confirm('Deletar pasta?')) {
    window.pastas.splice(index, 1);
    savePastas();
    loadPastas();
    showMessage('Pasta deletada', 'success');
  }
}

function addPasta(name, path) {
  window.pastas.push({name, path});
  savePastas();
  loadPastas();
}

