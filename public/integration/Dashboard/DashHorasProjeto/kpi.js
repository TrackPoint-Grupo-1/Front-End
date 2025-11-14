// KPI: TOTAL DE HORAS NÃO APONTADAS
// Busca em: GET /apontamento-horas/gerente/{id}/horas-faltantes?dataInicio=dd/MM/yyyy&dataFim=dd/MM/yyyy
// Período: mês atual (dinâmico). Também calcula variação vs mês anterior.

import { get } from "../../connection.js";

function getUsuarioLogado() {
	try {
		const raw = localStorage.getItem('usuarioLogado');
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function startOfMonth(d = new Date()) {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d = new Date()) {
	return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function ddmmyyyy(date) {
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const yyyy = String(date.getFullYear());
	return `${dd}/${mm}/${yyyy}`;
}

async function fetchHorasFaltantes(gerenteId, ini, fim) {
	const qs = `?dataInicio=${encodeURIComponent(ini)}&dataFim=${encodeURIComponent(fim)}`;
	const endpoint = `/apontamento-horas/gerente/${gerenteId}/horas-faltantes${qs}`;
	const val = await get(endpoint, { 'accept': 'application/json', 'User-Agent': 'trackpoint-frontend' });
	// API retorna um número (ex: 320.0)
	return Number(val ?? 0);
}

function findKpiCard() {
	const cards = document.querySelectorAll('.metric-card');
	for (const card of cards) {
		const title = card.querySelector('.metric-title')?.textContent?.trim()?.toUpperCase();
		if (title && title.includes('TOTAL DE HORAS NÃO APONTADAS')) return card;
	}
	return null;
}

function setKpiValue(card, valueHours) {
	const valueEl = card?.querySelector('.metric-value');
	if (!valueEl) return;
	// Formato simples: "320 h" (poderia ser convertido para H:mm se preferir)
	const isInt = Number.isInteger(valueHours);
	valueEl.textContent = isInt ? `${valueHours} h` : `${valueHours.toFixed(1)} h`;
}

function setKpiChange(card, percent) {
	const changeContainer = card?.querySelector('.metric-change');
	const icon = changeContainer?.querySelector('i');
	const span = changeContainer?.querySelector('span');
	if (!changeContainer || !icon || !span) return;

	if (!isFinite(percent)) {
		span.textContent = '+--%';
		changeContainer.classList.remove('positive', 'negative');
		changeContainer.classList.add('positive');
		icon.classList.remove('fa-arrow-down');
		icon.classList.add('fa-arrow-up');
		return;
	}

	const sign = percent >= 0 ? '+' : '';
	const cls = percent >= 0 ? 'positive' : 'negative';
	changeContainer.classList.remove('positive', 'negative');
	changeContainer.classList.add(cls);
	icon.classList.remove('fa-arrow-up', 'fa-arrow-down');
	icon.classList.add(percent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down');
	span.textContent = `${sign}${Math.abs(percent).toFixed(0)}%`;
}

// ---------- NOVO: KPIs de Alocação (Desenvolvimento / Reuniões) ----------
async function fetchApontamentos(gerenteId, ini, fim) {
	const qs = `?dataInicio=${encodeURIComponent(ini)}&dataFim=${encodeURIComponent(fim)}`;
	const endpoint = `/apontamento-horas/gerente/${gerenteId}${qs}`;
	try {
		const data = await get(endpoint, { 'User-Agent': 'trackpoint-frontend' });
		return Array.isArray(data) ? data : [];
	} catch (e) {
		// Tratar 404 como ausência de apontamentos (retorna lista vazia)
		if (typeof e?.message === 'string' && e.message.includes('[404]')) {
			console.info('fetchApontamentos: mês sem apontamentos (404) para', endpoint);
			return [];
		}
		throw e;
	}
}

function normalizeAcao(str) {
	return (str || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

function calculateAllocation(apontamentos) {
	let totalHoras = 0;
	let devHoras = 0;
	let reuniaoHoras = 0;
	for (const a of apontamentos) {
		const horas = Number(a.horasFeita ?? a.horas ?? 0);
		totalHoras += horas;
		const acaoNorm = normalizeAcao(a.acao);
		if (acaoNorm.includes('desenv')) devHoras += horas; // "desenvolvimento" abreviado
		else if (acaoNorm.startsWith('desenv')) devHoras += horas;
		else if (acaoNorm === 'desenvolvimento') devHoras += horas;
		else if (acaoNorm.startsWith('reuniao') || acaoNorm.includes('reuniao') || acaoNorm === 'reuniao') reuniaoHoras += horas;
	}
	return { totalHoras, devHoras, reuniaoHoras };
}

function findCardByTitleContains(text) {
	const cards = document.querySelectorAll('.metric-card');
	const target = text.toUpperCase();
	for (const card of cards) {
		const title = card.querySelector('.metric-title')?.textContent?.trim()?.toUpperCase();
		if (title && title.includes(target)) return card;
	}
	return null;
}

function setPercentCard(card, percent) {
	const valueEl = card?.querySelector('.metric-value');
	if (!valueEl) return;
	if (!isFinite(percent)) {
		valueEl.textContent = '--%';
	} else {
		valueEl.textContent = `${percent.toFixed(0)}%`;
	}
}

function setPercentVariation(card, currentPct, previousPct, hasBase) {
	const changeContainer = card?.querySelector('.metric-change');
	const icon = changeContainer?.querySelector('i');
	const span = changeContainer?.querySelector('span');
	if (!changeContainer || !icon || !span) return;
	// Reset visuals
	changeContainer.classList.remove('positive', 'negative');
	icon.style.display = '';
	icon.classList.remove('fa-arrow-up', 'fa-arrow-down');

	// Sem base de comparação (mês anterior inexistente)
	if (!hasBase || !isFinite(previousPct)) {
		span.textContent = 'N/A';
		icon.style.display = 'none';
		return;
	}

	// Base existe, mas mês anterior foi 0%
	if (previousPct === 0) {
		if (!isFinite(currentPct) || currentPct === 0) {
			span.textContent = '0%';
			icon.style.display = 'none';
			return;
		}
		// mostrar variação em pontos percentuais quando anterior = 0
		span.textContent = `+${currentPct.toFixed(0)} pp`;
		changeContainer.classList.add('positive');
		icon.classList.add('fa-arrow-up');
		return;
	}

	// Comparação padrão: diferença de pontos percentuais
	const delta = currentPct - previousPct;
	const cls = delta >= 0 ? 'positive' : 'negative';
	changeContainer.classList.add(cls);
	icon.classList.add(delta >= 0 ? 'fa-arrow-up' : 'fa-arrow-down');
	const sign = delta >= 0 ? '+' : '';
	span.textContent = `${sign}${Math.abs(delta).toFixed(0)}%`;
}

async function initKpis() {
	const user = getUsuarioLogado();
	const gerenteId = user?.id;
	if (!gerenteId) return;

	const ini = ddmmyyyy(startOfMonth());
	const fim = ddmmyyyy(endOfMonth());

	// KPI horas não apontadas (já existente)
	const horasCard = findKpiCard();
	if (horasCard) {
		try {
			const atual = await fetchHorasFaltantes(gerenteId, ini, fim);
			setKpiValue(horasCard, atual);
			// variação
			const now = new Date();
			const prevRef = new Date(now.getFullYear(), now.getMonth() - 1, 15);
			const prevIni = ddmmyyyy(startOfMonth(prevRef));
			const prevFim = ddmmyyyy(endOfMonth(prevRef));
			let variacao = NaN;
			try {
				const anterior = await fetchHorasFaltantes(gerenteId, prevIni, prevFim);
				if (anterior > 0) variacao = ((atual - anterior) / anterior) * 100;
			} catch {}
			setKpiChange(horasCard, variacao);
		} catch (e) {
			console.error('Erro KPI horas não apontadas:', e);
		}
	}

	// KPI alocação (Desenvolvimento / Reuniões)
	let apontAtual = [];
	try {
		apontAtual = await fetchApontamentos(gerenteId, ini, fim);
	} catch (e) {
		console.error('Erro ao buscar apontamentos atuais:', e);
	}
	const { totalHoras, devHoras, reuniaoHoras } = calculateAllocation(apontAtual);
	const devPct = totalHoras > 0 ? (devHoras / totalHoras) * 100 : 0;
	const reuniaoPct = totalHoras > 0 ? (reuniaoHoras / totalHoras) * 100 : 0;

	// mês anterior
	const prevRef = new Date();
	prevRef.setMonth(prevRef.getMonth() - 1);
	const prevIni = ddmmyyyy(startOfMonth(prevRef));
	const prevFim = ddmmyyyy(endOfMonth(prevRef));
	let devPctPrev = NaN;
	let reuniaoPctPrev = NaN;
	let devPrevHasBase = false;
	let reuniaoPrevHasBase = false;
	try {
		const apontPrev = await fetchApontamentos(gerenteId, prevIni, prevFim);
		const prevAlloc = calculateAllocation(apontPrev);
		if (prevAlloc.totalHoras > 0) {
			devPctPrev = (prevAlloc.devHoras / prevAlloc.totalHoras) * 100;
			reuniaoPctPrev = (prevAlloc.reuniaoHoras / prevAlloc.totalHoras) * 100;
			devPrevHasBase = true;
			reuniaoPrevHasBase = true;
		} else {
			// Sem horas => tratar como 0% base existente para exibir variação em pp
			devPctPrev = 0;
			reuniaoPctPrev = 0;
			devPrevHasBase = true;
			reuniaoPrevHasBase = true;
		}
	} catch (e) {
		console.warn('Falha ao buscar apontamentos do mês anterior:', e);
		// Em erro (inclui 404 já convertido para [] antes), garantir base 0
		devPctPrev = 0;
		reuniaoPctPrev = 0;
		devPrevHasBase = true;
		reuniaoPrevHasBase = true;
	}

	const devCard = findCardByTitleContains('% DE ALOCAÇÃO EM DESENVOLVIMENTO');
	const reuniaoCard = findCardByTitleContains('% DE ALOCAÇÃO EM REUNIÕES');
	if (devCard) {
		setPercentCard(devCard, devPct);
		setPercentVariation(devCard, devPct, devPctPrev, devPrevHasBase);
	}
	if (reuniaoCard) {
		setPercentCard(reuniaoCard, reuniaoPct);
		setPercentVariation(reuniaoCard, reuniaoPct, reuniaoPctPrev, reuniaoPrevHasBase);
	}
}

document.addEventListener('DOMContentLoaded', () => {
    initKpis();
});

