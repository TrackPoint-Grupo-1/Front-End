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
function normalize(s){
  const base = (s||'').toString().trim().toLowerCase().normalize('NFD');
  try { return base.replace(/\p{Diacritic}/gu,''); } catch { return base.replace(/[\u0300-\u036f]/g,''); }
}
async function fetchApont(gerenteId, ini, fim){
  const qs = `?dataInicio=${encodeURIComponent(ini)}&dataFim=${encodeURIComponent(fim)}`;
  const endpoint = `/apontamento-horas/gerente/${gerenteId}${qs}`;
  try {
    const data = await get(endpoint, { 'User-Agent':'trackpoint-frontend' });
    return Array.isArray(data) ? data : [];
  } catch(e){
    if (typeof e?.message === 'string' && e.message.includes('[404]')) {
      console.info('fetchApont (desenvolvimento): mês sem apontamentos (404) para', endpoint);
      return [];
    }
    throw e;
  }
}
function calculateAllocationDev(apont){
  let totalHoras = 0; let devHoras = 0;
  for (const a of apont){
    const horas = Number(a.horasFeita ?? a.horas ?? 0);
    totalHoras += horas;
    const act = normalize(a.acao);
    if (act.includes('desenv') || act.startsWith('desenv') || act === 'desenvolvimento') devHoras += horas;
  }
  return { totalHoras, devHoras };
}
function calcPctDev(apont){
  const { totalHoras, devHoras } = calculateAllocationDev(apont);
  return totalHoras > 0 ? (devHoras / totalHoras) * 100 : 0;
}
function build(container, atual, anterior){
  if(!container) return;
  const clamp = v => Math.max(0, Math.min(100, v));
  const hAnt = clamp(anterior);
  const hAtu = clamp(atual);
  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:1.25rem;width:100%;height:220px;padding:4px 2px;box-sizing:border-box;">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
        <div style="flex:1;display:flex;align-items:flex-end;width:100%;">
          <div style="margin:0 auto;width:55%;background:linear-gradient(135deg,#a78bfa,#6d28d9);border-radius:6px 6px 0 0;position:relative;height:${hAnt === 0 ? 4 : hAnt}%;transition:height .6s cubic-bezier(.4,.2,.2,1);">
            <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.7rem;font-weight:600;color:#6d28d9;">${hAnt.toFixed(0)}%</span>
          </div>
        </div>
        <span style="margin-top:8px;font-size:.65rem;color:#475569;font-weight:500;">MÊS ANTERIOR</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
        <div style="flex:1;display:flex;align-items:flex-end;width:100%;">
          <div style="margin:0 auto;width:55%;background:linear-gradient(135deg,#22c55e,#15803d);border-radius:6px 6px 0 0;position:relative;height:${hAtu === 0 ? 4 : hAtu}%;transition:height .6s cubic-bezier(.4,.2,.2,1);">
            <span style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:.7rem;font-weight:600;color:#166534;">${hAtu.toFixed(0)}%</span>
          </div>
        </div>
        <span style="margin-top:8px;font-size:.65rem;color:#475569;font-weight:500;">MÊS ATUAL</span>
      </div>
    </div>
    <div style="margin-top:.6rem;font-size:.6rem;color:#64748b;text-align:center;">Percentual de horas em Desenvolvimento sobre o total apontado (escala fixa 0-100%).</div>
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
    const apAtual = await fetchApont(gerenteId, iniAtual, fimAtual);
    let apAnt = [];
    try { apAnt = await fetchApont(gerenteId, iniAnt, fimAnt); } catch(errPrev){ console.warn('Mês anterior sem dados ou erro (desenvolvimento):', errPrev); apAnt = []; }
    console.log('[Desenvolvimento] qtd atual:', apAtual.length, 'qtd anterior:', apAnt.length);
    const pctAtual = calcPctDev(apAtual);
    const pctAnt = calcPctDev(apAnt);
    // Diagnóstico quando total>0 mas pct==0
    const totalAtual = apAtual.reduce((acc,a)=> acc + (Number(a.horasFeita ?? a.horas ?? 0) || 0),0);
    if (totalAtual>0 && pctAtual===0){
      console.debug('[Desenvolvimento] Verificação mês atual - primeiras ações normalizadas:', apAtual.slice(0,5).map(a=>({acao:a.acao, norm:normalize(a.acao), horas:a.horasFeita??a.horas})));
    }
    build(container, pctAtual, pctAnt);
  }catch(e){
    console.error('Erro gráfico desenvolvimento:', e);
    build(container, 0, 0);
  }
}
document.addEventListener('DOMContentLoaded', initDevChart);
