// Cordova Folder Picker - Android/Windows/Desktop
async function selectFolder() {
  console.log('selectFolder called');
  console.log('cordova:', !!window.cordova);
  console.log('fileChooser tem?:', !!window.fileChooser);
  return new Promise((resolve, reject) => {
    if (window.cordova && window.fileChooser) {
      // Android/Cordova
      console.log('===> Android/Cordova')
      if (cordova.platformId === 'browser') {
        console.log('no browser ')
        const input = document.createElement('input');
        console.log(input)
        input.type = 'file';
        input.webkitdirectory = true;
        input.onchange = (e) => {
          console.log(e)
          // Browser fallback code aqui (copiar da parte desktop)
          const musicas = [];
          for (let i = 0; i < e.target.files.length; i++) {
            if (e.target.files[i].name.toLowerCase().endsWith('.pdf')) {
              const name = e.target.files[i].name.replace('.pdf', '').trim();
              const dash = name.lastIndexOf(' - ');
              const parts = dash > 0 ? [name.slice(0, dash), name.slice(dash + 3)] : ['Desconhecido', name];
              musicas.push({
                _id: Date.now() + Math.random().toString(36).substr(2, 9),
                name: e.target.files[i].name,
                titulo: parts[1] || name,
                artista: parts[0],
                genero: 'Geral',
                path: e.target.files[i].webkitRelativePath || e.target.files[i].name,
                fullPath: window.getRootPasta() + (e.target.files[i].webkitRelativePath || e.target.files[i].name),
              pasta: e.target.files[0].webkitRelativePath.split('/')[0] + '/',
              size: Math.round(e.target.files[i].size / 1024) + ' KB'
            });
          }
        }
        resolve({musicas, pasta: musicas[0]?.pasta || '/', name: musicas[0]?.pasta?.split('/')[0] || 'Pasta'});
      };
      input.click();
        return;
      }
      window.fileChooser.open(function(uri) {
        window.resolveLocalFileSystemURL(uri, function(dirEntry) {
          const folderPath = dirEntry.nativeURL;
          console.log('Cordova folder:', folderPath);
          
          // Scan recursivo
          const musicas = [];
          function scan(entry) {
            const reader = entry.createReader();
            reader.readEntries(function(entries) {
              for (let i = 0; i < entries.length; i++) {
                if (entries[i].isDirectory) {
                  scan(entries[i]);
                } else if (entries[i].name.toLowerCase().endsWith('.pdf')) {
                  const name = entries[i].name.replace('.pdf', '').trim();
                  const dash = name.lastIndexOf(' - ');
                  const parts = dash > 0 ? [name.slice(0, dash), name.slice(dash + 3)] : ['Desconhecido', name];
                  musicas.push({
                    _id: Date.now() + Math.random().toString(36).substr(2, 9),
                    name: entries[i].name,
                    titulo: parts[1] || name,
                    artista: parts[0],
                    genero: 'Geral',
                    path: entries[i].name,
                    fullPath: entries[i].nativeURL,
                    pasta: folderPath,
                    size: '0 KB'
                  });
                }
              }
              if (musicas.length > 0) {
                resolve({musicas, pasta: folderPath, name: folderPath.split(/[\\\\\\/]/).pop()});
              }
            }, reject);
          }
          scan(dirEntry);
        }, reject);
      }, reject);
    } else if (window.Windows && window.Windows.Storage) {
      // Windows UWP/Cordova Windows
      console.log('Windows picker');
      var picker = new Windows.Storage.Pickers.FolderPicker();
      picker.SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
      picker.fileTypeFilter.replaceAll(["*"]);
      picker.pickSingleFolderAsync().done(function(folder) {
        if (folder) {
          console.log("Windows folder full path:", folder.path);
          const folderPath = folder.path;
          const musicas = [];
          function scan(storageFolder) {
            storageFolder.getFilesAsync().done(function(files) {
              files.forEach(function(file) {
                if (file.fileType === '.pdf') {
                  const name = file.name.replace('.pdf', '').trim();
                  const dash = name.lastIndexOf(' - ');
                  const parts = dash > 0 ? [name.slice(0, dash), name.slice(dash + 3)] : ['Desconhecido', name];
                  musicas.push({
                    _id: Date.now() + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    titulo: parts[1] || name,
                    artista: parts[0],
                    genero: 'Geral',
                    path: file.name,
                    fullPath: file.path,
                    pasta: folderPath,
                    size: Math.round(file.size / 1024) + ' KB'
                  });
                }
              });
              storageFolder.getFoldersAsync().done(function(folders) {
                folders.forEach(function(subFolder) {
                  scan(subFolder);
                });
              });
            });
          }
          scan(folder);
          resolve({musicas, pasta: folderPath, name: folder.name});
        } else {
          reject('Folder picker cancelled');
        }
      });
    } else {
      console.log('no genérico. vale para todos ')
      // Generic desktop fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.onchange = (e) => {
        console.log('Desktop folder input:', e.target.files);
        const musicas = [];
        for (let i = 0; i < e.target.files.length; i++) {
          if (e.target.files[i].name.toLowerCase().endsWith('.pdf')) {
            const name = e.target.files[i].name.replace('.pdf', '').trim();
            const dash = name.lastIndexOf(' - ');
            const parts = dash > 0 ? [name.slice(0, dash), name.slice(dash + 3)] : ['Desconhecido', name];
            musicas.push({
              _id: Date.now() + Math.random().toString(36).substr(2, 9),
              name: e.target.files[i].name,
              titulo: parts[1] || name,
              artista: parts[0],
              genero: 'Geral',
                path: e.target.files[i].webkitRelativePath || e.target.files[i].name,
                fullPath: document.getElementById('root-pasta-input')?.value + (e.target.files[i].webkitRelativePath || e.target.files[i].name),
              pasta: e.target.files[0].webkitRelativePath.split('/')[0] + '/',
              size: Math.round(e.target.files[i].size / 1024) + ' KB'
            });
          }
        }
        resolve({musicas, pasta: musicas[0]?.pasta || '/', name: musicas[0]?.pasta?.split('/')[0] || 'Pasta'});
      };
      input.click();
    }
  });
}

// Export
window.selectFolder = selectFolder;

