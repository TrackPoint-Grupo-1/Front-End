// exportarGraficos.js
// Função de exportação para baixar PNG dos gráficos de barras atuais.
// Usa html2canvas (carregada dinamicamente) para capturar o elemento .chart-container dentro do card.

async function ensureHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error('Falha ao carregar html2canvas'));
    document.head.appendChild(script);
  });
}

function filenameFromTitle(title) {
  const base = (title || 'grafico').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0,60);
  const dt = new Date();
  const stamp = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  return `${base}_${stamp}.png`;
}

async function exportChart(card) {
  try {
    const html2canvas = await ensureHtml2Canvas();
    const chartEl = card.querySelector('.chart-container');
    if (!chartEl) {
      alert('Elemento de gráfico não encontrado.');
      return;
    }
    const title = card.querySelector('.card-title')?.textContent?.trim();
    // Adiciona classe temporária para garantir fundo branco
    chartEl.classList.add('exporting');
    const canvas = await html2canvas(chartEl, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        // Ajustes dentro do clone para preservar scroll interno se houver
        const cloneChart = doc.querySelector('.exporting');
        if (cloneChart) cloneChart.style.maxHeight = 'none';
      }
    });
    chartEl.classList.remove('exporting');
    const link = document.createElement('a');
    link.download = filenameFromTitle(title);
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    console.error('Erro ao exportar gráfico:', e);
    alert('Não foi possível exportar o gráfico.');
  }
}

function wireExportButtons() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const btn = card.querySelector('[data-export="chart"]');
    if (btn) {
      btn.addEventListener('click', () => exportChart(card));
    }
  });
}

document.addEventListener('DOMContentLoaded', wireExportButtons);
