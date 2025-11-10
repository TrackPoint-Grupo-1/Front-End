// Gráfico de barras: comparação % de alocação em Desenvolvimento
// GET /apontamento-horas/gerente/{id}?dataInicio=dd/MM/yyyy&dataFim=dd/MM/yyyy

import { get } from "../../connection.js";

function getUsuarioLogado(){
  try { const raw = localStorage.getItem('usuarioLogado'); return raw? JSON.parse(raw) : null; } catch { return null; }
}
const startOfMonth = (d=new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d=new Date()) => new Date(d.getFullYear(), d.getMonth()+1, 0);
function ddmmyyyy(date){
  const dd = String(date.getDate()).padStart(2,'0');
  const mm = String(date.getMonth()+1).padStart(2,'0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function normalize(s){ return (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); }
async function fetchApont(gerenteId, ini, fim){
  const qs = `?dataInicio=${encodeURIComponent(ini)}&dataFim=${encodeURIComponent(fim)}`;
  const endpoint = `/apontamento-horas/gerente/${gerenteId}${qs}`;
  const data = await get(endpoint, { 'User-Agent':'trackpoint-frontend' });
  return Array.isArray(data) ? data : [];
}
function calcPctDev(apont){
  let total=0, dev=0;
  for(const a of apont){
    const h = Number(a.horasFeita ?? a.horas ?? 0);
    total += h;
    const act = normalize(a.acao);
    if (act.includes('desenv') || act === 'desenvolvimento') dev += h;
  }
  return total>0 ? (dev/total)*100 : 0;
}
function build(container, atual, anterior){
  if(!container) return;
  const maxPct = Math.max(atual, anterior, 100);
  const h = v => (maxPct===0?0:(v/maxPct)*100);
  container.innerHTML = `
    <div style="display:flex;align-items:end;gap:1rem;width:100%;height:220px;">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
        <div style="width:55%;background:linear-gradient(135deg,#a78bfa,#6d28d9);border-radius:6px 6px 0 0;position:relative;height:${h(anterior)}%;min-height:4px;">
          <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.75rem;font-weight:600;color:#6d28d9;">${anterior.toFixed(0)}%</span>
        </div>
        <span style="margin-top:6px;font-size:.7rem;color:#475569;font-weight:500;">MÊS ANTERIOR</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
        <div style="width:55%;background:linear-gradient(135deg,#22c55e,#15803d);border-radius:6px 6px 0 0;position:relative;height:${h(atual)}%;min-height:4px;">
          <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.75rem;font-weight:600;color:#166534;">${atual.toFixed(0)}%</span>
        </div>
        <span style="margin-top:6px;font-size:.7rem;color:#475569;font-weight:500;">MÊS ATUAL</span>
      </div>
    </div>
    <div style="margin-top:.75rem;font-size:.65rem;color:#64748b;text-align:center;">Percentual de horas em Desenvolvimento sobre total de horas apontadas.</div>
  `;
}
async function initDevChart(){
  // encontra o card pelo título
  const cards = Array.from(document.querySelectorAll('.card'));
  const card = cards.find(c => c.querySelector('.card-title')?.textContent?.trim().toUpperCase().includes('HORAS EM DESENVOLVIMENTO'));
  if(!card) return;
  const container = card.querySelector('.chart-container');
  if(!container) return;

  const user = getUsuarioLogado();
  const gerenteId = user?.id;
  if(!gerenteId){ container.innerHTML = '<p style="color:#dc2626;font-size:.8rem;">Usuário não identificado.</p>'; return; }

  const iniAtual = ddmmyyyy(startOfMonth());
  const fimAtual = ddmmyyyy(endOfMonth());
  const refAnt = new Date(); refAnt.setMonth(refAnt.getMonth()-1);
  const iniAnt = ddmmyyyy(startOfMonth(refAnt));
  const fimAnt = ddmmyyyy(endOfMonth(refAnt));

  container.innerHTML = '<div class="chart-placeholder"><i class="fas fa-spinner fa-pulse"></i><p>Carregando...</p></div>';

  try{
    const [apAtual, apAnt] = await Promise.all([
      fetchApont(gerenteId, iniAtual, fimAtual),
      fetchApont(gerenteId, iniAnt, fimAnt)
    ]);
    console.log('[Desenvolvimento] qtd atual:', apAtual.length, 'qtd anterior:', apAnt.length);
    const pctAtual = calcPctDev(apAtual);
    const pctAnt = calcPctDev(apAnt);
    build(container, pctAtual, pctAnt);
  }catch(e){
    console.error('Erro gráfico desenvolvimento:', e);
    // fallback com zeros
    build(container, 0, 0);
  }
}
document.addEventListener('DOMContentLoaded', initDevChart);
