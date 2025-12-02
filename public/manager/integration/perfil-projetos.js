import { get } from '../../integration/connection.js';

function getUsuarioLogado() {
  try {
    const raw = localStorage.getItem('usuarioLogado');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function renderProjetos(nomes) {
  const container = document.querySelector('.projetos');
  if (!container) return;
  // clear current tags, keep the header
  const header = container.querySelector('h3');
  container.innerHTML = '';
  if (header) container.appendChild(header);

  if (!nomes || nomes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'projeto-tag';
    empty.textContent = 'Nenhum projeto em andamento';
    container.appendChild(empty);
    return;
  }

  nomes.forEach((nome) => {
    const tag = document.createElement('div');
    tag.className = 'projeto-tag';
    tag.textContent = nome;
    container.appendChild(tag);
  });
}

async function carregarProjetos() {
  const usuario = getUsuarioLogado();
  if (!usuario || !usuario.id) {
    renderProjetos([]);
    return;
  }
  const id = usuario.id;
  try {
    const data = await get(`/projetos/funcionario/${id}?status=ANDAMENTO`);
    const nomes = Array.isArray(data) ? data.map(p => p?.nome).filter(Boolean) : [];
    renderProjetos(nomes);
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
    renderProjetos([]);
  }
}

window.addEventListener('DOMContentLoaded', carregarProjetos);
