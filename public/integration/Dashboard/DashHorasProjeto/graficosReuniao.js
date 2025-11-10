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
  return (str||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
}

async function fetchApontamentos(gerenteId, ini, fim){
  const qs = `?dataInicio=${encodeURIComponent(ini)}&dataFim=${encodeURIComponent(fim)}`;
  const endpoint = `/apontamento-horas/gerente/${gerenteId}${qs}`;
  const data = await get(endpoint, { 'User-Agent': 'trackpoint-frontend' });
  return Array.isArray(data)? data : [];
}

function calcPctReuniao(apont){
  let total=0, reuniao=0;
  for(const a of apont){
    const horas = Number(a.horasFeita ?? a.horas ?? 0);
    total += horas;
    const act = normalize(a.acao);
    if (act.includes('reuniao')) reuniao += horas;
  }
  return total>0 ? (reuniao/total)*100 : 0;
}

function buildBarChart(container, atualPct, anteriorPct){
  if(!container) return;
  const maxPct = Math.max(atualPct, anteriorPct, 100); // limitar escala a 100%
  const toHeight = v => (maxPct === 0 ? 0 : (v / maxPct) * 100);
  container.innerHTML = `
    <div style="display:flex;align-items:end;gap:1rem;width:100%;height:220px;">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
        <div style="width:55%;background:linear-gradient(135deg,#64748b,#1e293b);border-radius:6px 6px 0 0;position:relative;height:${toHeight(anteriorPct)}%;min-height:4px;transition:.4s;">
          <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.75rem;font-weight:600;color:#334155;">${anteriorPct.toFixed(0)}%</span>
        </div>
        <span style="margin-top:6px;font-size:.7rem;letter-spacing:.5px;color:#475569;font-weight:500;">MÊS ANTERIOR</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
        <div style="width:55%;background:linear-gradient(135deg,#0ea5e9,#0369a1);border-radius:6px 6px 0 0;position:relative;height:${toHeight(atualPct)}%;min-height:4px;transition:.4s;">
          <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.75rem;font-weight:600;color:#075985;">${atualPct.toFixed(0)}%</span>
        </div>
        <span style="margin-top:6px;font-size:.7rem;letter-spacing:.5px;color:#475569;font-weight:500;">MÊS ATUAL</span>
      </div>
    </div>
    <div style="margin-top:0.75rem;font-size:.65rem;color:#64748b;text-align:center;">Percentual de horas em Reuniões comparado ao total de horas apontadas.</div>
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

  try {
    const [apontAtual, apontAnt] = await Promise.all([
      fetchApontamentos(gerenteId, iniAtual, fimAtual),
      fetchApontamentos(gerenteId, iniAnt, fimAnt)
    ]);
    console.log('[Reuniões] qtd atual:', apontAtual.length, 'qtd anterior:', apontAnt.length);
    const pctAtual = calcPctReuniao(apontAtual);
    const pctAnt = calcPctReuniao(apontAnt);
    buildBarChart(chartContainer, pctAtual, pctAnt);
  } catch (e){
    console.error('Erro gráfico reuniões:', e);
    // fallback com valores zerados
    buildBarChart(chartContainer, 0, 0);
  }
}

document.addEventListener('DOMContentLoaded', initGraficoReuniao);
