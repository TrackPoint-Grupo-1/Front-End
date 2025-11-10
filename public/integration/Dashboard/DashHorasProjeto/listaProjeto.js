// Lista e gerencia projetos do usuário logado na tela Manager > Horas em Projetos
// Requisitos:
// - GET /projetos/funcionario/{usuarioId}?status=ANDAMENTO
// - Mostrar: nome, gerentes, previsaoEntrega, status
// - Editar status via PUT /projetos/{id}/atualizar-status?novoStatus=...
// - Editar previsão via PUT /projetos/{id}/atualizar-previsao-entrega?novaPrevisao=dd-MM-yyyy
// - Adicionar usuário: PUT /projetos/{id}/adicionar-pessoas/usuario body: [ids]
// - Adicionar gerente: PUT /projetos/{id}/adicionar-pessoas/gerente body: [ids]

import { get, put } from "../../connection.js";

const projectsTbody = document.querySelector('#projects-table-body');
const searchInput = document.querySelector('#project-search');

let allProjects = [];

function getUsuarioLogado() {
  try {
    const raw = localStorage.getItem('usuarioLogado');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDateToInput(ddmmyyyy) {
  // dd-MM-yyyy -> yyyy-MM-dd
  if (!ddmmyyyy) return '';
  const m = ddmmyyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // fallback: se vier yyyy-MM-dd do backend, retorna como está
  return ddmmyyyy;
}

function formatDateToDDMMYYYY(value) {
  // aceita yyyy-MM-dd (de input type=date)
  if (!value) return '';
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function renderProjects(projects) {
  if (!projectsTbody) return;
  if (!projects || projects.length === 0) {
    projectsTbody.innerHTML = '<tr><td colspan="5">Nenhum projeto encontrado.</td></tr>';
    return;
  }
  const rows = projects.map(p => {
    const gerentes = (p.gerentes || []).map(g => g.nome).join(', ') || '-';
    const status = (p.status || '').toUpperCase();
    // previsaoEntrega pode vir como yyyy-MM-dd. Para input type=date, mantemos yyyy-MM-dd.
    const previsaoInput = (p.previsaoEntrega && /^\d{4}-\d{2}-\d{2}$/.test(p.previsaoEntrega))
      ? p.previsaoEntrega
      : formatDateToInput(p.previsaoEntrega);

    return `
      <tr data-id="${p.id}">
        <td style="font-weight:500;">${p.nome}</td>
        <td>${gerentes}</td>
        <td>
          <input type="date" class="proj-deadline" value="${previsaoInput || ''}" style="padding:0.35rem 0.5rem;" />
          <button class="btn btn-secondary btn-sm btn-save-date" style="margin-left:0.5rem;">Salvar</button>
        </td>
        <td>
          <select class="proj-status form-select" style="min-width:150px;">
            ${['ANDAMENTO','ATRASADO','CONCLUIDO','CANCELADO'].map(s => `<option value="${s}" ${s===status?'selected':''}>${s}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm btn-save-status" style="margin-left:0.5rem;">Salvar</button>
        </td>
        <td>
          <div class="actions" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm btn-add-user" title="Adicionar Usuário">
              <i class="fas fa-user-plus"></i> Usuário
            </button>
            <button class="btn btn-secondary btn-sm btn-add-manager" title="Adicionar Gerente">
              <i class="fas fa-user-tie"></i> Gerente
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  projectsTbody.innerHTML = rows;

  attachRowHandlers();
}

function attachRowHandlers() {
  // Salvar status
  projectsTbody.querySelectorAll('.btn-save-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tr = e.currentTarget.closest('tr');
      const id = tr?.getAttribute('data-id');
      const sel = tr?.querySelector('.proj-status');
      if (!id || !sel) return;
      const novoStatus = sel.value; // já em maiúsculas
      try {
        await put(`/projetos/${id}/atualizar-status?novoStatus=${encodeURIComponent(novoStatus)}`, null, { 'User-Agent': 'trackpoint-frontend' });
        alert('Status atualizado com sucesso!');
      } catch (err) {
        console.error('Erro ao atualizar status:', err);
        alert('Erro ao atualizar status.');
      }
    });
  });

  // Salvar previsão
  projectsTbody.querySelectorAll('.btn-save-date').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tr = e.currentTarget.closest('tr');
      const id = tr?.getAttribute('data-id');
      const inp = tr?.querySelector('.proj-deadline');
      if (!id || !inp) return;
      const novaIso = inp.value; // yyyy-MM-dd
      const novaPrevisao = formatDateToDDMMYYYY(novaIso);
      if (!novaPrevisao) {
        alert('Data inválida.');
        return;
      }
      try {
        await put(`/projetos/${id}/atualizar-previsao-entrega?novaPrevisao=${encodeURIComponent(novaPrevisao)}`, null, { 'User-Agent': 'trackpoint-frontend' });
        alert('Previsão de entrega atualizada!');
      } catch (err) {
        console.error('Erro ao atualizar previsão:', err);
        alert('Erro ao atualizar previsão de entrega.');
      }
    });
  });

  // Adicionar usuário
  projectsTbody.querySelectorAll('.btn-add-user').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tr = e.currentTarget.closest('tr');
      const id = tr?.getAttribute('data-id');
      if (!id) return;
      try {
        const usuarios = await get('/usuarios', { 'User-Agent': 'trackpoint-frontend' });
        const somenteUsuarios = (Array.isArray(usuarios) ? usuarios : []).filter(u => (u.cargo||'').toUpperCase() === 'USUARIO');
        const nomeToId = new Map(somenteUsuarios.map(u => [u.nome, u.id]));
        const listaNomes = somenteUsuarios.map(u => u.nome).join('\n');
        const nomeEscolhido = prompt('Digite (exatamente) o nome do usuário para adicionar, ou cancele:\n\n' + listaNomes);
        if (!nomeEscolhido) return;
        const userId = nomeToId.get(nomeEscolhido);
        if (!userId) {
          alert('Nome não encontrado.');
          return;
        }
        await put(`/projetos/${id}/adicionar-pessoas/usuario`, [userId], { 'User-Agent': 'trackpoint-frontend', 'Content-Type': 'application/json' });
        alert('Usuário adicionado ao projeto!');
      } catch (err) {
        console.error('Erro ao adicionar usuário:', err);
        alert('Erro ao adicionar usuário.');
      }
    });
  });

  // Adicionar gerente
  projectsTbody.querySelectorAll('.btn-add-manager').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tr = e.currentTarget.closest('tr');
      const id = tr?.getAttribute('data-id');
      if (!id) return;
      try {
        const usuarios = await get('/usuarios', { 'User-Agent': 'trackpoint-frontend' });
        const somenteGer = (Array.isArray(usuarios) ? usuarios : []).filter(u => (u.cargo||'').toUpperCase() === 'GERENTE');
        const nomeToId = new Map(somenteGer.map(u => [u.nome, u.id]));
        const listaNomes = somenteGer.map(u => u.nome).join('\n');
        const nomeEscolhido = prompt('Digite (exatamente) o nome do gerente para adicionar, ou cancele:\n\n' + listaNomes);
        if (!nomeEscolhido) return;
        const gerId = nomeToId.get(nomeEscolhido);
        if (!gerId) {
          alert('Nome não encontrado.');
          return;
        }
        await put(`/projetos/${id}/adicionar-pessoas/gerente`, [gerId], { 'User-Agent': 'trackpoint-frontend', 'Content-Type': 'application/json' });
        alert('Gerente adicionado ao projeto!');
      } catch (err) {
        console.error('Erro ao adicionar gerente:', err);
        alert('Erro ao adicionar gerente.');
      }
    });
  });
}

function handleSearch() {
  const q = (searchInput?.value || '').trim().toLowerCase();
  if (!q) {
    renderProjects(allProjects);
  } else {
    const filtered = allProjects.filter(p => (p.nome||'').toLowerCase().includes(q));
    renderProjects(filtered);
  }
}

async function loadProjects() {
  const user = getUsuarioLogado();
  const userId = user?.id;
  if (!userId) {
    if (projectsTbody) projectsTbody.innerHTML = '<tr><td colspan="5">Usuário não identificado.</td></tr>';
    return;
  }
  try {
    const data = await get(`/projetos/funcionario/${userId}?status=ANDAMENTO`, { 'User-Agent': 'trackpoint-frontend' });
    allProjects = Array.isArray(data) ? data : [];
    renderProjects(allProjects);
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
    if (projectsTbody) projectsTbody.innerHTML = '<tr><td colspan="5">Erro ao carregar projetos.</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  searchInput?.addEventListener('input', handleSearch);
});
