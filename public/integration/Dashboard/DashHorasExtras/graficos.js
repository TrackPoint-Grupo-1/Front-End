import { get } from "../../connection.js";

// Carrega Chart.js dinamicamente
function loadChartJs() {
	return new Promise((resolve, reject) => {
		if (window.Chart) return resolve();
		const s = document.createElement('script');
		s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
		s.onload = () => resolve();
		s.onerror = reject;
		document.head.appendChild(s);
	});
}

// Tenta obter o id do usuário logado do localStorage, senão usa fallback
function getFuncionarioId() {
	try {
		const raw = localStorage.getItem('user') || localStorage.getItem('usuario');
		if (raw) {
			const u = JSON.parse(raw);
			return u?.id || u?.usuario?.id || 1;
		}
	} catch {}
	return 1; // ajuste conforme seu app
}

// Helpers
function clearContainer(el) {
	while (el.firstChild) el.removeChild(el.firstChild);
}
function ensureCanvas(container) {
	let canvas = container.querySelector('canvas');
	if (!canvas) {
		canvas = document.createElement('canvas');
		container.appendChild(canvas);
	}
	return canvas;
}
function pickLabel(item) {
	return (
		item?.usuario?.nome ||
		item?.nome ||
		item?.colaborador?.nome ||
		item?.usuarioNome ||
		`Usuário ${item?.usuarioId ?? ''}`.trim()
	);
}
function pickValue(item) {
	const v = item?.horasExtras ?? item?.horas ?? item?.totalHoras ?? item?.quantidade ?? 0;
	return Number(v) || 0;
}

// ➕ Helpers necessários para a tabela (repostos)
function pickUserId(item) {
	return item?.usuario?.id ?? item?.usuarioId ?? item?.idUsuario ?? item?.id;
}

async function fetchUsuarioById(usuarioId) {
	return await get(`/usuarios/${usuarioId}`);
}

function hoursToHHMMSS(hours) {
	const totalSeconds = Math.max(0, Math.round((Number(hours) || 0) * 3600));
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	const pad = (n) => String(n).padStart(2, '0');
	return `${h}:${pad(m)}:${pad(s)}`;
}

function getInitials(name) {
	if (!name) return '';
	const parts = String(name).trim().split(/\s+/);
	const a = parts[0]?.[0] || '';
	const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
	return (a + b).toUpperCase();
}

function buildStatus(percent) {
	if (percent >= 0.9) {
		return {
			html: `<span class="status-badge danger"><i class="fas fa-ban"></i> Crítico</span>`,
			level: 'danger'
		};
	}
	if (percent >= 0.6) {
		return {
			html: `<span class="status-badge warning"><i class="fas fa-exclamation-triangle"></i> Atenção</span>`,
			level: 'warning'
		};
	}
	return {
		html: `<span class="status-badge success"><i class="fas fa-check-circle"></i> OK</span>`,
		level: 'success'
	};
}

// === Exportação CSV da tabela de Limitação ===
let limitationExportData = [];
let limitationExportBtnAttached = false;

function exportLimitationCSV() {
	if (!limitationExportData.length) {
		console.warn('Sem dados para exportar.');
		return;
	}
	const headers = ['Status', 'Colaborador', 'Limite de Horas', 'Horas Extras'];
	const rows = limitationExportData.map(r => [
		r.status,
		r.colaborador,
		r.limite,
		r.horasExtras
	]);

	const csv = [headers, ...rows].map(line =>
		line.map(v => {
			const s = String(v ?? '');
			// escapa aspas e vírgulas
			if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
			return s;
		}).join(',')
	).join('\n');

	// BOM para abrir corretamente no Excel
	const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'limitacao-horas-extras.csv';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function attachExportLimitation() {
	if (limitationExportBtnAttached) return;
	const tbody = document.getElementById('table_limite_horas_extras_body');
	if (!tbody) return;
	const card = tbody.closest('.card');
	if (!card) return;
	const exportBtn = card.querySelector('.card-actions .btn i.fa-download')?.closest('.btn');
	if (!exportBtn) return;

	exportBtn.onclick = null;
	exportBtn.addEventListener('click', exportLimitationCSV);
	limitationExportBtnAttached = true;
}

let chartRanking = null;

async function fetchProjetosDoFuncionario(funcionarioId) {
	const url = `/projetos/funcionario/${funcionarioId}?status=ANDAMENTO`;
	return await get(url);
}

async function fetchRankingPorProjeto(projetoId) {
	const url = `/horas-extras/ranking/projeto/${projetoId}`;
	return await get(url);
}

// ➕ (repor) constrói o select de projetos no card
function buildProjetoSelect(cardEl, projetos, onChange) {
	const actions = cardEl.querySelector('.card-actions');
	if (!actions) return null;

	// Evita múltiplos selects
	let existing = actions.querySelector('#rankingProjetoSelect');
	if (existing) {
		existing.innerHTML = '';
	} else {
		existing = document.createElement('select');
		existing.id = 'rankingProjetoSelect';
		existing.className = 'btn btn-secondary btn-sm';
		existing.style.minWidth = '220px';
		existing.style.marginRight = '0.5rem';
		actions.insertBefore(existing, actions.firstChild);
	}

	projetos.forEach(p => {
		const opt = document.createElement('option');
		opt.value = p.id;
		opt.textContent = `${p.nome}`;
		existing.appendChild(opt);
	});

	existing.addEventListener('change', (e) => onChange(Number(e.target.value)));
	return existing;
}

// ➕ (repor) botão de exportar PNG do gráfico
function attachExport(canvas, cardEl) {
	const exportBtn = cardEl.querySelector('.card-actions .btn i.fa-download')?.closest('.btn');
	if (!exportBtn) return;

	// Evita múltiplos handlers
	exportBtn.onclick = null;
	exportBtn.addEventListener('click', () => {
		const link = document.createElement('a');
		link.href = canvas.toDataURL('image/png');
		link.download = 'ranking-horas-extras.png';
		link.click();
	});
}

async function renderRanking(container) {
	const cardEl = container.closest('.card');

	// 1) Carregar Chart.js
	await loadChartJs();

	// 2) Garantir canvas
	clearContainer(container);
	const canvas = ensureCanvas(container);
	const ctx = canvas.getContext('2d');

	// 3) Buscar projetos do usuário
	const funcionarioId = getFuncionarioId();
	let projetos = [];
	try {
		projetos = await fetchProjetosDoFuncionario(funcionarioId);
	} catch (e) {
		console.error('Erro buscando projetos do funcionário:', e);
	}

	if (!Array.isArray(projetos) || projetos.length === 0) {
		container.innerHTML = `<div class="chart-placeholder"><i class="fas fa-triangle-exclamation"></i><p>Nenhum projeto em andamento encontrado.</p></div>`;
		return;
	}

	// 4) Montar select
	const select = buildProjetoSelect(cardEl, projetos, async (projId) => {
		await updateChartForProject(projId, projetos.find(p => p.id === projId)?.nome || `Projeto ${projId}`);
		await updateTableForProject(projId); // sincroniza a tabela
	});

	// 5) Render inicial (primeiro projeto)
	const initialProj = projetos[0];
	if (select) select.value = String(initialProj.id);
	await updateChartForProject(initialProj.id, initialProj.nome);
	await updateTableForProject(initialProj.id); // render inicial da tabela

	// 6) Exportar
	attachExport(canvas, cardEl);

	async function updateChartForProject(projetoId, projetoNome) {
		let ranking = [];
		try {
			ranking = await fetchRankingPorProjeto(projetoId);
		} catch (e) {
			console.error('Erro buscando ranking de horas extras:', e);
		}

		if (!Array.isArray(ranking)) ranking = [];

		// Normaliza e ordena
		const rows = ranking.map(it => ({
			label: pickLabel(it),
			value: pickValue(it)
		})).sort((a, b) => b.value - a.value);

		const labels = rows.map(r => r.label);
		const data = rows.map(r => r.value);

		// Criar/atualizar gráfico
		if (chartRanking) {
			chartRanking.data.labels = labels;
			chartRanking.data.datasets[0].data = data;
			chartRanking.options.plugins.title.text = `Ranking de Horas Extras - ${projetoNome}`;
			chartRanking.update();
		} else {
			chartRanking = new window.Chart(ctx, {
				type: 'bar',
				data: {
					labels,
					datasets: [{
						label: 'Horas extras (h)',
						data,
						backgroundColor: '#059669',
						borderRadius: 6,
						maxBarThickness: 40
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						title: {
							display: true,
							text: `Ranking de Horas Extras - ${projetoNome}`,
							color: '#0f172a',
							font: { size: 14, weight: '600' }
						},
						tooltip: {
							callbacks: {
								label: (ctx) => ` ${ctx.parsed.y.toFixed(2)} h`
							}
						}
					},
					scales: {
						x: {
							ticks: { color: '#374151', autoSkip: false, maxRotation: 30, minRotation: 0 },
							grid: { display: false }
						},
						y: {
							beginAtZero: true,
							title: { display: true, text: 'Horas (h)' },
							grid: { color: 'rgba(0,0,0,0.05)' }
						}
					}
				}
			});
			// Ajusta altura do container para barras
			container.style.height = Math.max(260, labels.length * 36) + 'px';
		}

		console.log(`Ranking (projeto ${projetoId}):`, rows);
	}

	async function updateTableForProject(projetoId) {
		const tbody = document.getElementById('table_limite_horas_extras_body');
		if (!tbody) return;

		// estado de carregamento
		tbody.innerHTML = `<tr><td colspan="4">Carregando...</td></tr>`;

		let ranking = [];
		try {
			ranking = await fetchRankingPorProjeto(projetoId);
		} catch (e) {
			console.error('Erro buscando ranking de horas extras (tabela):', e);
		}
		if (!Array.isArray(ranking)) ranking = [];

		// Ordena por horas extras desc
		const rows = ranking.map(it => ({
			id: pickUserId(it),
			nome: pickLabel(it),
			horasExtras: pickValue(it)
		})).sort((a, b) => b.horasExtras - a.horasExtras);

		// Busca detalhes dos usuários (limite/email)
		const uniqueIds = [...new Set(rows.map(r => r.id).filter(Boolean))];
		const userMap = {};
		await Promise.all(uniqueIds.map(async id => {
			try {
				const u = await fetchUsuarioById(id);
				userMap[id] = u;
			} catch (e) {
				console.warn(`Falha ao buscar usuário ${id}:`, e);
			}
		}));

		// Render
		tbody.innerHTML = '';
		if (rows.length === 0) {
			tbody.innerHTML = `<tr><td colspan="4">Nenhum dado de horas extras para este projeto.</td></tr>`;
			limitationExportData = [];
			return;
		}

		// Monta linhas e prepara dados para exportação
		limitationExportData = [];
		rows.forEach(r => {
			const u = userMap[r.id] || {};
			const nome = r.nome || u.nome || `Usuário ${r.id}`;
			const email = u.email || '';
			const limite = Number(u.limiteHorasExtrasMes ?? 0) || 0;
			const percent = limite > 0 ? (r.horasExtras / limite) : 0;
			const statusInfo = buildStatus(percent);
			const statusText = statusInfo.level === 'danger' ? 'Crítico' : statusInfo.level === 'warning' ? 'Atenção' : 'OK';

			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>${statusInfo.html}</td>
				<td>
					<div style="display: flex; align-items: center; gap: 0.5rem;">
						<div style="width: 32px; height: 32px; border-radius: 50%; background: #0d9488; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: 600;">${getInitials(nome)}</div>
						<div>
							<div style="font-weight: 500;">${nome}</div>
							<div style="font-size: 0.75rem; color: #64748b;">${email}</div>
						</div>
					</div>
				</td>
				<td>${hoursToHHMMSS(limite)}</td>
				<td>${hoursToHHMMSS(r.horasExtras)}</td>
			`;
			tbody.appendChild(tr);

			// Alimenta dados para CSV
			limitationExportData.push({
				status: statusText,
				colaborador: nome,
				limite: hoursToHHMMSS(limite),
				horasExtras: hoursToHHMMSS(r.horasExtras)
			});
		});

		// Garante o handler do botão Exportar do card da tabela
		attachExportLimitation();

		console.log(`Tabela Limitação – Projeto ${projetoId}:`, rows.map(x => ({
			usuarioId: x.id,
			nome: x.nome,
			limite: userMap[x.id]?.limiteHorasExtrasMes ?? 0,
			horasExtras: x.horasExtras
		})));
	}
}

async function renderDistribuicaoPorProjeto(container) {
	const cardEl = container.closest('.card');

	// 1) Carregar Chart.js
	await loadChartJs();

	// 2) Garantir canvas
	clearContainer(container);
	const canvas = ensureCanvas(container);
	const ctx = canvas.getContext('2d');

	// 3) Buscar projetos do usuário
	const funcionarioId = getFuncionarioId();
	let projetos = [];
	try {
		projetos = await fetchProjetosDoFuncionario(funcionarioId);
	} catch (e) {
		console.error('Erro buscando projetos do funcionário (distribuição):', e);
	}
	if (!Array.isArray(projetos) || projetos.length === 0) {
		container.innerHTML = `<div class="chart-placeholder"><i class="fas fa-triangle-exclamation"></i><p>Nenhum projeto em andamento encontrado.</p></div>`;
		return;
	}

	// 4) Para cada projeto, buscar o ranking e somar as horas extras do projeto
	let dataset = [];
	try {
		const results = await Promise.all(projetos.map(async (p) => {
			try {
				const ranking = await fetchRankingPorProjeto(p.id);
				const totalExtras = Array.isArray(ranking) ? ranking.reduce((s, item) => s + (pickValue(item) || 0), 0) : 0;
				return { id: p.id, nome: p.nome, totalExtras };
			} catch (e) {
				console.warn(`Falha ao buscar ranking para projeto ${p.id}:`, e);
				return { id: p.id, nome: p.nome, totalExtras: 0 };
			}
		}));
		dataset = results.filter(r => r.totalExtras > 0);
	} catch (e) {
		console.error('Erro montando distribuição por projeto:', e);
	}

	if (dataset.length === 0) {
		container.innerHTML = `<div class="chart-placeholder"><i class="fas fa-circle-info"></i><p>Sem horas extras registradas nos projetos.</p></div>`;
		return;
	}

	// 5) Preparar dados para o gráfico
	const labels = dataset.map(d => d.nome);
	const data = dataset.map(d => d.totalExtras);

	// Gerar cores
	const palette = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f43f5e','#84cc16','#eab308','#06b6d4'];
	const colors = labels.map((_, i) => palette[i % palette.length]);

	// 6) Renderizar Doughnut
	const chart = new window.Chart(ctx, {
		type: 'doughnut',
		data: {
			labels,
			datasets: [{
				data,
				backgroundColor: colors,
				borderWidth: 1,
				borderColor: '#fff',
				hoverOffset: 6
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { position: 'bottom' },
				title: {
					display: true,
					text: 'Distribuição de Horas Extras por Projeto',
					color: '#0f172a',
					font: { size: 14, weight: '600' }
				},
				tooltip: {
					callbacks: {
						label: (ctx) => {
							const total = ctx.dataset.data.reduce((s, v) => s + v, 0) || 1;
							const val = Number(ctx.parsed);
							const pct = ((val / total) * 100).toFixed(1);
							return ` ${ctx.label}: ${val.toFixed(2)} h (${pct}%)`;
						}
					}
				}
			}
		},
		cutout: '55%'
	});

	// Ajusta altura do container
	container.style.height = '320px';

	// 7) Exportar PNG do gráfico
	attachExport(canvas, cardEl);

	console.log('Distribuição de Horas Extras por Projeto:', dataset);
}

// Helpers de data
function fmtDDMMYYYY(d) {
	const dd = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const yy = d.getFullYear();
	return `${dd}/${mm}/${yy}`;
}
function monthStart(year, monthIdx) { return new Date(year, monthIdx, 1); }
function monthEnd(year, monthIdx) { return new Date(year, monthIdx + 1, 0); }
function monthLabelPT(i) {
	const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
	return nomes[i] || `M${i+1}`;
}

// Busca usuários do gerente a partir dos apontamentos (ano todo)
async function fetchUsuarioIdsDoGerente(gerenteId, ano) {
	const di = fmtDDMMYYYY(new Date(ano, 0, 1));
	const df = fmtDDMMYYYY(new Date(ano, 11, 31));
	const url = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(di)}&dataFim=${encodeURIComponent(df)}`;
	try {
		const itens = await get(url);
		const ids = new Set();
		(itens || []).forEach(it => {
			const id = it.projeto?.usuarios?.[0]?.id ?? it.usuarioId ?? it.usuario?.id;
			if (id) ids.add(id);
		});
		return [...ids];
	} catch (e) {
		console.warn('Falha ao buscar usuários do gerente:', e);
		return [];
	}
}

// Solicitações (planejadas) por usuário no mês – apenas lançamentos vinculados a projetos permitidos
// allowedProjectIds: Set<number> com os projetos do gerente (opcional). Se informado, só conta itens cujo projeto pertence a esse conjunto.
async function fetchHorasSolicitadasUsuarioMes(usuarioId, dataInicio, dataFim, allowedProjectIds) {
	const url = `/horas-extras/listar-horas/${usuarioId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}&foiSolicitado=true`;
	try {
		const resp = await get(url);

		// Preferimos calcular a partir dos itens (listaHoras) para poder filtrar por projeto
		if (Array.isArray(resp?.listaHoras)) {
			const total = resp.listaHoras.reduce((s, h) => {
				const projId = h?.projetoId ?? h?.projeto?.id ?? h?.idProjeto;
				// Exige que tenha projeto
				if (projId == null) return s;
				// Se houver lista de projetos permitidos, restringe a ela
				if (allowedProjectIds && allowedProjectIds.size > 0 && !allowedProjectIds.has(Number(projId))) return s;

				// Duração aproximada por diferença (HH:MM)
				const [h1 = 0, m1 = 0] = String(h.horasDe || '00:00').split(':').map(n => Number(n) || 0);
				const [h2 = 0, m2 = 0] = String(h.horasAte || '00:00').split(':').map(n => Number(n) || 0);
				const dur = Math.max(0, (h2 + m2/60) - (h1 + m1/60));
				return s + dur;
			}, 0);
			return Number(total.toFixed(2));
		}

		// Se não houver itens, NÃO usamos total agregado pois não permite filtrar por projeto
		return 0;
	} catch (e) {
		return 0;
	}
}

// Realizadas (extras efetivas) do gerente no mês
async function fetchHorasExtrasRealizadasGerenteMes(gerenteId, dataInicio, dataFim) {
	const url = `/horas-extras/total-horas-extras/projetos-gerente/${gerenteId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;
	try {
		const resp = await get(url);
		// Tenta várias formas comuns de resposta
		if (typeof resp === 'number') return Number(resp) || 0;
		if (resp?.totalHorasExtras != null) return Number(resp.totalHorasExtras) || 0;
		if (resp?.horasExtras != null) return Number(resp.horasExtras) || 0;
		if (resp?.horaExtra != null) {
			// HH:MM:SS -> horas
			const [h='0',m='0',s='0'] = String(resp.horaExtra).split(':');
			return (Number(h)||0) + (Number(m)||0)/60 + (Number(s)||0)/3600;
		}
		if (Array.isArray(resp?.projetos)) {
			return resp.projetos.reduce((s, p) => s + (Number(p.horasExtras || p.totalHorasExtras || 0) || 0), 0);
		}
		return Number(resp?.total ?? 0) || 0;
	} catch (e) {
		return 0;
	}
}

// Projetos do gerente (no ano): obtidos a partir de apontamentos de horas
async function fetchProjetoIdsDoGerente(gerenteId, ano) {
	const di = fmtDDMMYYYY(new Date(ano, 0, 1));
	const df = fmtDDMMYYYY(new Date(ano, 11, 31));
	const url = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(di)}&dataFim=${encodeURIComponent(df)}`;
	try {
		const itens = await get(url);
		const ids = new Set();
		(itens || []).forEach(it => {
			const pid = it?.projeto?.id ?? it?.projetoId ?? it?.idProjeto;
			if (pid != null) ids.add(Number(pid));
		});
		return ids; // Set<number>
	} catch (e) {
		console.warn('Falha ao buscar projetos do gerente:', e);
		return new Set();
	}
}

async function renderDesvioPlanejadoRealizado(container) {
	const cardEl = container.closest('.card');
	// 1) Chart.js
	await loadChartJs();

	// 2) Canvas
	clearContainer(container);
	const canvas = ensureCanvas(container);
	const ctx = canvas.getContext('2d');

	// 3) Parâmetros (ano atual)
	const now = new Date();
	const ano = now.getFullYear();
	const gerenteId = 2; // ajuste se necessário
	const nomesExtFull = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

	// 4) Usuários e Projetos do gerente
	const usuarioIds = await fetchUsuarioIdsDoGerente(gerenteId, ano);
	const projetoIdsSet = await fetchProjetoIdsDoGerente(gerenteId, ano);

	if (!usuarioIds.length) {
		container.innerHTML = `<div class="chart-placeholder"><i class="fas fa-circle-info"></i><p>Sem usuários vinculados ao gerente para ${ano}.</p></div>`;
		return;
	}

	// 5) Montar séries mês a mês (Jan..Dez)
	const labels = Array.from({ length: 12 }, (_, i) => monthLabelPT(i));
	const planejadas = new Array(12).fill(0);
	const realizadas = new Array(12).fill(0);

	// Para limitar chamadas, processa em série por mês
	for (let m = 0; m < 12; m++) {
		const di = fmtDDMMYYYY(monthStart(ano, m));
		const df = fmtDDMMYYYY(monthEnd(ano, m));

		// Planejadas (somatório das solicitações de todos os usuários) – apenas se vinculadas a projetos do gerente
		let somaSolic = 0;
		await Promise.all(
			usuarioIds.map(uid => fetchHorasSolicitadasUsuarioMes(uid, di, df, projetoIdsSet).then(v => { somaSolic += (Number(v) || 0); }))
		);
		planejadas[m] = Number(somaSolic.toFixed(2));

		// Realizadas (extras efetivas do gerente no mês)
		const real = await fetchHorasExtrasRealizadasGerenteMes(gerenteId, di, df);
		realizadas[m] = Number((Number(real) || 0).toFixed(2));
	}

	// 6) Render gráfico (área)
	const chart = new window.Chart(ctx, {
		type: 'line',
		data: {
			labels,
			datasets: [
				{
					label: 'Planejadas (Solicitadas) - h',
					data: planejadas,
					tension: 0.3,
					borderColor: '#0ea5e9',
					backgroundColor: 'rgba(14,165,233,0.25)',
					fill: true,
					pointRadius: 3
				},
				{
					label: 'Realizadas - h',
					data: realizadas,
					tension: 0.3,
					borderColor: '#059669',
					backgroundColor: 'rgba(5,150,105,0.25)',
					fill: true,
					pointRadius: 3
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { position: 'bottom' },
				title: {
					display: true,
					text: `Desvio entre Horas Extras Planejadas vs. Realizadas (${ano})`,
					color: '#0f172a',
					font: { size: 14, weight: '600' }
				},
				tooltip: {
					mode: 'index',
					intersect: false,
					callbacks: {
						label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toFixed(2)} h`
					}
				}
			},
			scales: {
				y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, title: { display: true, text: 'Horas (h)' } },
				x: { grid: { display: false } }
			}
		}
	});

	// Altura do container
	container.style.height = '360px';

	// 7) Badge (mês atual)
	const mesAtual = now.getMonth();
	const pl = planejadas[mesAtual] || 0;
	const rl = realizadas[mesAtual] || 0;
	// Desvio absoluto: 0/0 => 0%; 0/x => 100%; senão => |x - y|/y*100
	const diffPct = (pl === 0 && rl === 0) ? 0 : (pl === 0 ? 100 : (Math.abs(rl - pl) / pl) * 100);
	const badge = cardEl.querySelector('.card-actions span');
	if (badge) {
		// Sem sinal no badge (sempre positivo)
		badge.textContent = `${diffPct.toFixed(1)}% em ${nomesExtFull[mesAtual]} de ${ano}`;
		// aplica cor
		setBadgeColor(badge, diffPct);
	}

	// 8) Exportar PNG
	attachExport(canvas, cardEl);

	// 9) Filtro por mês (se existir botão com ícone de filtro)
	const actions = cardEl.querySelector('.card-actions');
	const filterBtn = actions?.querySelector('.btn i.fa-filter')?.closest('.btn');
	if (actions && filterBtn) {
		// Novo seletor de mês
		const monthSelect = document.createElement('select');
		monthSelect.className = 'btn btn-secondary btn-sm';
		monthSelect.style.minWidth = '120px';
		monthSelect.style.marginRight = '0.5rem';

		// Opções: Jan..Dez
		for (let i = 0; i < 12; i++) {
			const opt = document.createElement('option');
			opt.value = i;
			opt.textContent = nomesExtFull[i];
			monthSelect.appendChild(opt);
		}

		// Substitui ícone por seletor
		const icon = filterBtn.querySelector('i');
		if (icon) {
			const parent = icon.closest('.btn');
			parent.innerHTML = ''; // limpa ícone
			parent.appendChild(monthSelect);
		}

		// Atualiza gráfico e badge ao mudar mês
		monthSelect.addEventListener('change', async (e) => {
			const mmIdx = Number(e.target.value);
			const yyyy = ano;

			// Atualiza gráfico para o mês escolhido
			chart.data.labels = [monthLabelPT(mmIdx)];
			chart.data.datasets[0].data = [planejadas[mmIdx]];
			chart.data.datasets[1].data = [realizadas[mmIdx]];
			chart.options.plugins.title.text = `Desvio entre Horas Extras Planejadas vs. Realizadas (${nomesExtFull[mmIdx]} de ${yyyy})`;
			chart.update();

			// Recalcula badge
			const pct = (planejadas[mmIdx] === 0 && realizadas[mmIdx] === 0)
				? 0
				: (planejadas[mmIdx] === 0 ? 100 : (Math.abs(realizadas[mmIdx] - planejadas[mmIdx]) / planejadas[mmIdx]) * 100);
			if (badge) {
				badge.textContent = `${pct.toFixed(1)}% em ${nomesExtFull[mmIdx]} de ${yyyy}`;
				setBadgeColor(badge, pct); // aplica cor
			}
		});
	}
}

// Helper para colorir o badge conforme percentual
function setBadgeColor(badgeEl, percent) {
	if (!badgeEl) return;
	// vermelho se > 50%, senão teal
	badgeEl.style.color = percent > 50 ? '#dc2626' /* red-600 */ : '#0d9488' /* teal-600 */;
}

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('chart_ranking_horas_extras');
	if (!container) return;
	renderRanking(container);

	const distContainer = document.getElementById('chart_distribuicao_horas_extras');
	if (distContainer) renderDistribuicaoPorProjeto(distContainer);

	// Novo: desvio planejado vs realizado
	const desvioContainer = document.getElementById('chart_desvio_planejado_realizado');
	if (desvioContainer) renderDesvioPlanejadoRealizado(desvioContainer);

	// Novo: Comparação Anual
	const comparacaoAnualContainer = document.getElementById('chart_comparacao_anual');
	if (comparacaoAnualContainer) renderComparacaoAnual(comparacaoAnualContainer);
});

async function renderComparacaoAnual(container) {
	const cardEl = container.closest('.card');

	// Chart.js
	await loadChartJs();

	// Canvas
	clearContainer(container);
	const canvas = ensureCanvas(container);
	const ctx = canvas.getContext('2d');

	// Parâmetros iniciais
	let baseYear = new Date().getFullYear();
	let years = [baseYear - 1, baseYear];
	const gerenteId = 2; // ajuste conforme necessário

	// Utilitário: coleta totais mensais de horas extras para um ano
	async function collectYearData(year) {
		const promises = Array.from({ length: 12 }, (_, m) => {
			const di = fmtDDMMYYYY(monthStart(year, m));
			const df = fmtDDMMYYYY(monthEnd(year, m));
			return fetchHorasExtrasRealizadasGerenteMes(gerenteId, di, df);
		});
		const values = await Promise.all(promises);
		return values.map(v => Number(v || 0));
	}

	// Coleta dados dos dois anos
	let seriesA = await collectYearData(years[0]);
	let seriesB = await collectYearData(years[1]);

	// Labels Jan..Dez
	const labels = Array.from({ length: 12 }, (_, i) => monthLabelPT(i));

	// Cores
	const colors = ['#93c5fd', '#3b82f6'];

	// Gráfico (barras agrupadas)
	const chart = new window.Chart(ctx, {
		type: 'bar',
		data: {
			labels,
			datasets: [
				{ label: String(years[0]), data: seriesA, backgroundColor: colors[0], borderRadius: 6, maxBarThickness: 28 },
				{ label: String(years[1]), data: seriesB, backgroundColor: colors[1], borderRadius: 6, maxBarThickness: 28 }
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { position: 'bottom' },
				title: {
					display: true,
					text: 'Comparação da Quantidade de Horas Extras Anual',
					color: '#0f172a',
					font: { size: 14, weight: '600' }
				},
				tooltip: {
					mode: 'index',
					intersect: false,
					callbacks: {
						label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toFixed(2)} h`
					}
				}
			},
			scales: {
				x: { grid: { display: false } },
				y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, title: { display: true, text: 'Horas (h)' } }
			}
		}
	});

	// Exportar PNG
	attachExport(canvas, cardEl);

	// Checkboxes: atualiza labels para os anos e faz toggle de séries
	const actions = cardEl.querySelector('.card-actions');
	const cbs = actions?.querySelectorAll('input[type="checkbox"]') || [];
	cbs.forEach((cb, idx) => {
		const label = cb.closest('label');
		// garante texto com o ano correto
		if (label) {
			let txtNode = Array.from(label.childNodes).find(n => n.nodeType === 3);
			if (txtNode) txtNode.nodeValue = ' ' + String(years[idx] ?? '');
			else label.appendChild(document.createTextNode(' ' + String(years[idx] ?? '')));
		}
		cb.checked = true;
		cb.dataset.year = String(years[idx] ?? '');
		cb.onchange = () => {
			if (chart.data.datasets[idx]) {
				chart.data.datasets[idx].hidden = !cb.checked;
				chart.update();
			}
		};
	});

	// Botão Filtrar: define ano base (YYYY) e recarrega os dados (ano-1, ano)
	const filterBtn = actions?.querySelector('.btn i.fa-filter')?.closest('.btn');
	if (filterBtn) {
		filterBtn.onclick = null;
		filterBtn.addEventListener('click', async () => {
			const val = prompt('Informe o ano base (YYYY):', String(baseYear));
			if (!val) return;
			const parsed = parseInt(val, 10);
			if (isNaN(parsed) || parsed < 2000 || parsed > 2100) return;

			baseYear = parsed;
			years = [baseYear - 1, baseYear];

			// Recoleta séries
			seriesA = await collectYearData(years[0]);
			seriesB = await collectYearData(years[1]);

			// Atualiza datasets e labels/checkboxes
			chart.data.datasets[0].label = String(years[0]);
			chart.data.datasets[1].label = String(years[1]);
			chart.data.datasets[0].data = seriesA;
			chart.data.datasets[1].data = seriesB;
			chart.update();

			// Atualiza texto dos checkboxes
			cbs.forEach((cb, idx) => {
				const label = cb.closest('label');
				if (label) {
					let txtNode = Array.from(label.childNodes).find(n => n.nodeType === 3);
					if (txtNode) txtNode.nodeValue = ' ' + String(years[idx] ?? '');
					else label.appendChild(document.createTextNode(' ' + String(years[idx] ?? '')));
				}
				cb.dataset.year = String(years[idx] ?? '');
				// mantém estado atual de checked; apenas reflete visibilidade
				if (chart.data.datasets[idx]) {
					chart.data.datasets[idx].hidden = !cb.checked;
				}
			});
			chart.update();
		});
	}
}
