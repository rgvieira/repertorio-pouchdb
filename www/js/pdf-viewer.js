import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.432/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.432/pdf.worker.min.mjs';

class PDFViewer {
  constructor() {
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageRendering = false;
    this.pageNumPending = null;
    this.scale = 1.5;
    this.canvas = document.getElementById('pdf-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.strokes = []; // {x,y,color,width}
    this.currentTool = 'pen';
    this.currentColor = '#0000ff';
    this.lineWidth = 2;
    
    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDraw());
    this.canvas.addEventListener('touchstart', (e) => this.startDraw(e.touches[0]));
    this.canvas.addEventListener('touchmove', (e) => this.draw(e.touches[0]));
    this.canvas.addEventListener('touchend', () => this.stopDraw());

    document.getElementById('color-picker').addEventListener('change', (e) => {
      this.currentColor = e.target.value;
    });
    
    document.getElementById('clear-btn').addEventListener('click', () => this.clearAnnotations());
    document.getElementById('save-btn').addEventListener('click', () => this.saveAnnotations());
    document.getElementById('export-pdf').addEventListener('click', () => this.exportPDF());
  }

  static open(pdfPath, title = 'PDF Viewer') {
    document.getElementById('pdf-title').textContent = title;
    document.getElementById('pdf-modal').style.display = 'flex';
    
    // Load PDF from local file
    const pdfUrl = pdfPath.startsWith('file://') ? pdfPath : pdfPath;
    pdfjsLib.getDocument(pdfUrl).promise.then((pdf) => {
      window.pdfViewer.pdfDoc = pdf;
      window.pdfViewer.renderPage(1);
    }).catch(console.error);
  }

  renderPage(num) {
    this.pageNum = num;
    this.pageRendering = true;

    this.pdfDoc.getPage(num).then((page) => {
      const viewport = page.getViewport({scale: this.scale});
      this.canvas.height = viewport.height;
      this.canvas.width = viewport.width;

      const renderContext = {
        canvasContext: this.ctx,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        this.pageRendering = false;
        if (this.pageNumPending !== null) {
          this.renderPage(this.pageNumPending);
          this.pageNumPending = null;
        }
        this.redrawAnnotations();
      });
    });
  }

  startDraw(e) {
    if (window.currentTool !== 'pen' && window.currentTool !== 'highlight') return;
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.currentStroke = {points: [{x, y}], color: this.currentColor, width: this.lineWidth};
  }

  draw(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.currentStroke.points.push({x, y});
    this.redrawAnnotations();
  }

  stopDraw() {
    if (this.isDrawing && this.currentStroke) {
      this.strokes.push(this.currentStroke);
      this.currentStroke = null;
    }
    this.isDrawing = false;
  }

  redrawAnnotations() {
    // Clear canvas except PDF (render PDF first, annotations on top)
    // For simplicity, we redraw full page + annotations
    if (this.pdfDoc) {
      this.renderPage(this.pageNum);
    }
    
    // Draw strokes
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.strokes.forEach(stroke => {
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.width;
      this.ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) this.ctx.moveTo(p.x, p.y);
        else this.ctx.lineTo(p.x, p.y);
      });
      this.ctx.stroke();
    });
    
    if (this.currentStroke) {
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.beginPath();
      this.currentStroke.points.forEach((p, i) => {
        if (i === 0) this.ctx.moveTo(p.x, p.y);
        else this.ctx.lineTo(p.x, p.y);
      });
      this.ctx.stroke();
    }
  }

  clearAnnotations() {
    this.strokes = [];
    this.redrawAnnotations();
  }

  async saveAnnotations() {
    if (!app.db) return showMessage('DB not available', 'error');
    
    const musica = app.musicas.find(m => m.path === window.currentPDFPath);
    if (!musica) return;

    const strokesJson = JSON.stringify(this.strokes);
    
    await new Promise((resolve) => {
      app.db.transaction((tx) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO anotacoes (musica_id, page_num, strokes) VALUES (?, ?, ?)`,
          [musica.id, this.pageNum, strokesJson],
          resolve
        );
      });
    });
    showMessage('Anotações salvas!');
  }

  async exportPDF() {
    // Use jsPDF to overlay annotations (simplified - regenerate PDF with canvas)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgData = this.canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 10, 10, 190, 277); // A4 size
    doc.save('repertorio-anotado.pdf');
  }
}

// Init
window.pdfViewer = new PDFViewer();

// Expose to app.js
window.PDFViewer = PDFViewer;

