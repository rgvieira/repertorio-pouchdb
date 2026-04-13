#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const androidManifestPath = path.join(
  __dirname,
  '..',
  '..',
  'platforms',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);

if (!fs.existsSync(androidManifestPath)) {
  // Tenta localização antiga (algumas versões do Cordova Android)
  const oldPath = path.join(
    __dirname,
    '..',
    '..',
    'platforms',
    'android',
    'AndroidManifest.xml'
  );
  if (fs.existsSync(oldPath)) {
    fs.writeFileSync(androidManifestPath, fs.readFileSync(oldPath));
  } else {
    console.log('AndroidManifest.xml não encontrado, pulando hook.');
    process.exit(0);
  }
}

let content = fs.readFileSync(androidManifestPath, 'utf8');

// Se já tiver o namespace tools, não faz nada
if (content.includes('xmlns:tools="http://schemas.android.com/tools"')) {
  process.exit(0);
}

// Adiciona xmlns:tools na tag <manifest>
content = content.replace(
  /<manifest\s+xmlns:android="([^"]+)"/,
  '<manifest xmlns:android="$1" xmlns:tools="http://schemas.android.com/tools"'
);

fs.writeFileSync(androidManifestPath, content, 'utf8');
console.log('Namespace tools adicionado ao AndroidManifest.xml');