// Viewer JS - Carrega PDF por ID do PouchDB
class PDFViewer {
  constructor() {
    this.canvas = document.getElementById('pdf-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.pdfDoc = null;
    this.scale = 1.2;
    this.pageNum = 1;
    this.init();
  }

  async init() {

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
      this.showError('ID não fornecido');
      return;
    }

    try {
      // Usar a instância global ou garantir o nome correto do banco
      const manager = new PouchDBManager('repertorio');
      const doc = await manager.read(id);
     
console.log(doc.fullPath)      
      if (!doc || !doc.fullPath) {
        this.showError('Arquivo não encontrado');
        return;
      }

     document.getElementById('pdf-title').textContent = doc.nome;
      document.getElementById('pdf-path').textContent = doc.fullPath;
      document.getElementById('pdf-header').style.display = 'block';
      document.getElementById('pdf-loading').style.display = 'none';
      document.getElementById('pdf-error').style.display = 'none';
      document.getElementById('pdf-canvas').style.display = 'block';
      document.getElementById('pdf-controls').classList.remove('hidden');

      this.loadPDF(doc.fullPath);
    } catch (e) {
      this.showError('Erro ao carregar: ' + e.message);
    }
  }

  async loadPDF(path) {
    try {
      const pdfUrl = URL.createObjectURL(await fetch(path).then(r => r.blob()));
      this.pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
      this.renderPage(1);
    } catch (e) {
      this.showError('Erro PDF: ' + e.message);
    }
  }

async renderPage(num) {
    const page = await this.pdfDoc.getPage(num);
    const viewport = page.getViewport({scale: this.scale});
    this.canvas.height = viewport.height;
    this.canvas.width = viewport.width;

    const renderContext = {
      canvasContext: this.ctx,
      viewport: viewport
    };
    await page.render(renderContext).promise;
    document.getElementById('page-info').textContent = `Página ${this.pageNum} de ${this.pdfDoc.numPages}`;
  }

  showError(msg) {
    document.getElementById('pdf-title').textContent = 'Erro';
    document.getElementById('pdf-path').textContent = msg;
    document.getElementById('pdf-loading').style.display = 'none';
    document.getElementById('pdf-canvas').style.display = 'none';
    document.getElementById('pdf-controls').classList.add('hidden');
    document.getElementById('pdf-error').style.display = 'block';
    document.getElementById('error-msg').textContent = msg;
  }

  async nextPage() {
    if (this.pageNum < this.pdfDoc.numPages) {
      this.pageNum++;
      await this.renderPage(this.pageNum);
      document.getElementById('page-info').textContent = `Página ${this.pageNum} de ${this.pdfDoc.numPages}`;
    }
  }

  async prevPage() {
    if (this.pageNum > 1) {
      this.pageNum--;
      await this.renderPage(this.pageNum);
      document.getElementById('page-info').textContent = `Página ${this.pageNum} de ${this.pdfDoc.numPages}`;
    }
  }
}

// Global
window.pdfViewer = null;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  window.pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  window.pdfViewer = new PDFViewer();
});
