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

  try {
    // Buscar separadamente para garantir que falha em mês anterior não anule mês atual
    const apontAtual = await fetchApontamentos(gerenteId, iniAtual, fimAtual);
    let apontAnt = [];
    try {
      apontAnt = await fetchApontamentos(gerenteId, iniAnt, fimAnt);
    } catch(errPrev){
      console.warn('Mês anterior sem dados ou erro:', errPrev);
      apontAnt = [];
    }
    console.log('[Reuniões] qtd atual:', apontAtual.length, 'qtd anterior:', apontAnt.length);
    const pctAtual = calcPctReuniao(apontAtual);
    const pctAnt = calcPctReuniao(apontAnt);
    // Diagnóstico se houve horas mas nenhuma categorizada como reunião
    const totalAtual = apontAtual.reduce((acc,a)=> acc + (Number(a.horasFeita ?? a.horas ?? 0) || 0), 0);
    const totalAnt = apontAnt.reduce((acc,a)=> acc + (Number(a.horasFeita ?? a.horas ?? 0) || 0), 0);
    console.debug('[Reuniões] totais calculados:', {
      totalHorasAtual: totalAtual,
      reuniaoHorasAtual: calculateAllocation(apontAtual).reuniaoHoras,
      totalHorasAnterior: totalAnt,
      reuniaoHorasAnterior: calculateAllocation(apontAnt).reuniaoHoras,
      pctAtual,
      pctAnt
    });
    if (totalAtual>0 && pctAtual===0){
      console.debug('[Reuniões] Verificação mês atual - primeiras ações normalizadas:', apontAtual.slice(0,5).map(a=>({acao:a.acao, norm:normalize(a.acao), horas:a.horasFeita??a.horas})));
    }
    if (totalAnt>0 && pctAnt===0){
      console.debug('[Reuniões] Verificação mês anterior - primeiras ações normalizadas:', apontAnt.slice(0,5).map(a=>({acao:a.acao, norm:normalize(a.acao), horas:a.horasFeita??a.horas})));
    }
    buildBarChart(chartContainer, pctAtual, pctAnt);
  } catch (e){
    console.error('Erro gráfico reuniões:', e);
    // fallback com valores zerados
    buildBarChart(chartContainer, 0, 0);
  }
}

document.addEventListener('DOMContentLoaded', initGraficoReuniao);
