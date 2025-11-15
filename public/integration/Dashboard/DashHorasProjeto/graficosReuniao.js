// Gráfico de barras: comparação % de alocação em Reuniões
// Usa o mesmo endpoint de apontamentos mensais do gerente
// GET /apontamento-horas/gerente/{id}?dataInicio=dd/MM/yyyy&dataFim=dd/MM/yyyy

import { get } from "../../connection.js";

function getUsuarioLogado() {
  try {
    const raw = localStorage.getItem('usuarioLogado');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function ddmmyyyy(date){
  const dd = String(date.getDate()).padStart(2,'0');
  const mm = String(date.getMonth()+1).padStart(2,'0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function normalize(str){
  // Normaliza e remove diacríticos. Usa propriedade Unicode quando disponível; fallback para intervalo combinante.
  const base = (str||'').toString().trim().toLowerCase().normalize('NFD');
  // Alguns navegadores já suportam \p{Diacritic}; caso contrário usar regex clássico
  try {
    return base.replace(/\p{Diacritic}/gu,'');
  } catch {
    return base.replace(/[\u0300-\u036f]/g,'');
  }
}

// Calcula alocação (total e horas de reunião) seguindo mesma lógica dos KPIs
function calculateAllocation(apontamentos){
  let totalHoras = 0;
  let reuniaoHoras = 0;
  for (const a of apontamentos){
    const horas = Number(a.horasFeita ?? a.horas ?? 0);
    totalHoras += horas;
    const acaoNorm = normalize(a.acao);
    // Critérios de reunião (amplo): qualquer ocorrência de 'reuni' captura 'reuniao', 'reunioes', 'reuni', etc.
    if (acaoNorm.includes('reuni')) {
      reuniaoHoras += horas;
    }
  }
  return { totalHoras, reuniaoHoras };
}

async function fetchApontamentos(gerenteId, ini, fim){
  const qs = `?dataInicio=${encodeURIComponent(ini)}&dataFim=${encodeURIComponent(fim)}`;
  const endpoint = `/apontamento-horas/gerente/${gerenteId}${qs}`;
  try {
    const data = await get(endpoint, { 'User-Agent': 'trackpoint-frontend' });
    return Array.isArray(data)? data : [];
  } catch(e){
    if (typeof e?.message === 'string' && e.message.includes('[404]')) {
      console.info('fetchApontamentos (reuniões): mês sem apontamentos (404) para', endpoint);
      return [];
    }
    throw e;
  }
}

// Percentual calculado diretamente da alocação
function calcPctReuniao(apont){
  const { totalHoras, reuniaoHoras } = calculateAllocation(apont);
  return totalHoras > 0 ? (reuniaoHoras / totalHoras) * 100 : 0;
}

function buildBarChart(container, atualPct, anteriorPct){
  if(!container) return;
  // Escala fixa em 100%. Cap valores fora do intervalo.
  const clamp = v => Math.max(0, Math.min(100, v));
  const hAnterior = clamp(anteriorPct);
  const hAtual = clamp(atualPct);
  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:1.25rem;width:100%;height:220px;padding:4px 2px;box-sizing:border-box;">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
        <div style="flex:1;display:flex;align-items:flex-end;width:100%;">
          <div style="margin:0 auto;width:55%;background:linear-gradient(135deg,#64748b,#1e293b);border-radius:6px 6px 0 0;position:relative;height:${hAnterior === 0 ? 4 : hAnterior}%;transition:height .6s cubic-bezier(.4,.2,.2,1);">
            <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.7rem;font-weight:600;color:#334155;">${hAnterior.toFixed(0)}%</span>
          </div>
        </div>
        <span style="margin-top:8px;font-size:.65rem;letter-spacing:.5px;color:#475569;font-weight:500;">MÊS ANTERIOR</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
        <div style="flex:1;display:flex;align-items:flex-end;width:100%;">
          <div style="margin:0 auto;width:55%;background:linear-gradient(135deg,#0ea5e9,#0369a1);border-radius:6px 6px 0 0;position:relative;height:${hAtual === 0 ? 4 : hAtual}%;transition:height .6s cubic-bezier(.4,.2,.2,1);">
            <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.7rem;font-weight:600;color:#075985;">${hAtual.toFixed(0)}%</span>
          </div>
        </div>
        <span style="margin-top:8px;font-size:.65rem;letter-spacing:.5px;color:#475569;font-weight:500;">MÊS ATUAL</span>
      </div>
    </div>
    <div style="margin-top:0.6rem;font-size:.6rem;color:#64748b;text-align:center;">Percentual de horas em Reuniões sobre o total apontado. Altura proporcional ao % (escala 0-100).</div>
  `;
}

async function initGraficoReuniao(){
  // localizar card pelo título
  const cards = Array.from(document.querySelectorAll('.card'));
  const reuniaoCard = cards.find(c => c.querySelector('.card-title')?.textContent?.trim().toUpperCase().includes('HORAS EM REUNIÃO'));
  if(!reuniaoCard) return;
  const chartContainer = reuniaoCard.querySelector('.chart-container');
  if(!chartContainer) return;

  const user = getUsuarioLogado();
  const gerenteId = user?.id;
  if(!gerenteId){
    chartContainer.innerHTML = '<p style="color:#dc2626;font-size:.8rem;">Usuário não identificado.</p>';
    return;
  }

  // datas
  const iniAtual = ddmmyyyy(startOfMonth());
  const fimAtual = ddmmyyyy(endOfMonth());
  const refAnt = new Date(); refAnt.setMonth(refAnt.getMonth()-1);
  const iniAnt = ddmmyyyy(startOfMonth(refAnt));
  const fimAnt = ddmmyyyy(endOfMonth(refAnt));

  chartContainer.innerHTML = '<div class="chart-placeholder"><i class="fas fa-spinner fa-pulse"></i><p>Carregando...</p></div>';

  // Helpers de projeto
  const getProjetoId = (a) => a?.projeto?.id ?? a?.projetoId ?? a?.idProjeto ?? a?.codigoProjeto ?? null;
  async function fetchProjetosDoGerente(idGerente){
    try{
      const projetos = await get(`/projetos/funcionario/${idGerente}?status=ANDAMENTO`, { 'User-Agent':'trackpoint-frontend' });
      if (!Array.isArray(projetos)) return [];
      const idNum = Number(idGerente);
      const filtrados = projetos.filter(p => Array.isArray(p.gerentes) ? p.gerentes.some(g => Number(g.id) === idNum) : true);
      return filtrados;
    } catch { return []; }
  }
  function ensureProjetoSelect(cardEl){
    const actions = cardEl.querySelector('.card-actions');
    if (!actions) return null;
    let sel = actions.querySelector('#reuniaoProjetoSelect');
    if (!sel){
      sel = document.createElement('select');
      sel.id = 'reuniaoProjetoSelect';
      sel.className = 'btn btn-secondary btn-sm';
      sel.style.minWidth = '220px';
      sel.style.marginRight = '0.5rem';
      actions.insertBefore(sel, actions.firstChild);
    } else {
      sel.innerHTML = '';
    }
    return sel;
  }

  try {
    const projetos = await fetchProjetosDoGerente(gerenteId);
    const select = ensureProjetoSelect(reuniaoCard);
    let currentProjeto = 'ALL';
    if (select){
      const optAll = document.createElement('option');
      optAll.value = 'ALL';
      optAll.textContent = 'Todos os Projetos';
      select.appendChild(optAll);
      (projetos||[]).forEach(p=>{
        const opt = document.createElement('option');
        opt.value = String(p.id);
        opt.textContent = p.nome || `Projeto ${p.id}`;
        select.appendChild(opt);
      });
      select.value = 'ALL';
    }

    async function render(projId){
      // Buscar separadamente para garantir que falha em mês anterior não anule mês atual
      const apontAtual = await fetchApontamentos(gerenteId, iniAtual, fimAtual);
      let apontAnt = [];
      try {
        apontAnt = await fetchApontamentos(gerenteId, iniAnt, fimAnt);
      } catch(errPrev){
        console.warn('Mês anterior sem dados ou erro:', errPrev);
        apontAnt = [];
      }

      let atualFiltrado = apontAtual;
      let antFiltrado = apontAnt;
      if (projId && projId !== 'ALL'){
        const pid = Number(projId);
        atualFiltrado = apontAtual.filter(a => Number(getProjetoId(a)) === pid);
        antFiltrado = apontAnt.filter(a => Number(getProjetoId(a)) === pid);
      }

      const pctAtual = calcPctReuniao(atualFiltrado);
      const pctAnt = calcPctReuniao(antFiltrado);
      buildBarChart(chartContainer, pctAtual, pctAnt);
    }

    await render(currentProjeto);
    if (select){
      select.addEventListener('change', async (e)=>{
        currentProjeto = e.target.value;
        chartContainer.innerHTML = '<div class="chart-placeholder"><i class="fas fa-spinner fa-pulse"></i><p>Carregando...</p></div>';
        await render(currentProjeto);
      });
    }
  } catch (e){
    console.error('Erro gráfico reuniões:', e);
    // fallback com valores zerados
    buildBarChart(chartContainer, 0, 0);
  }
}

document.addEventListener('DOMContentLoaded', initGraficoReuniao);
