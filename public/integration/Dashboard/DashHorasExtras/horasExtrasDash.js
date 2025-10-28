import { get } from "../../connection.js";

// Util: converte "HH:mm:ss" para horas em decimal
const parseHHMMSStoHours = (hhmmss) => {
    if (!hhmmss || typeof hhmmss !== 'string') return 0;
    const [h = '0', m = '0', s = '0'] = hhmmss.split(':');
    const hours = Number(h) + Number(m) / 60 + Number(s) / 3600;
    return Number.isFinite(hours) ? hours : 0;
};

async function loadKpiPlanejadasVsExecutadas() {
    const diasUteisMes = 22; // dias úteis fixos
    const gerenteId = 2; // ajuste conforme necessário

    // Datas do mês atual
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const fmt = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`; // mantém dd/MM/yyyy conforme backend
    };

    const dataInicio = fmt(firstDay);
    const dataFim = fmt(lastDay);

    const endpoint = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;

    console.log("▶️ Requisição – endpoint:", endpoint);

    const card = document.getElementById('kpi_planejadas_executadas');
    if (!card) return;

    const valueEl = card.querySelector('.metric-value');
    const changeEl = card.querySelector('.metric-change');
    const changeIcon = changeEl.querySelector('i');
    const changeSpan = changeEl.querySelector('span');

    try {
        const apontamentos = await get(endpoint);
        console.log("✅ Dados retornados:", apontamentos);

        // Agrupa por funcionário e calcula horas planejadas/executadas
        const funcionarios = {};
        apontamentos.forEach(item => {
            const user = item.projeto?.usuarios?.[0] || { id: item.usuarioId, nome: `Usuário ${item.usuarioId}`, jornada: item.jornada || 8 };
            if (!user) return;

            const uid = user.id;
            if (!funcionarios[uid]) {
                const jornada = Number(user.jornada || 8);
                funcionarios[uid] = {
                    nome: user.nome || `id_${uid}`,
                    jornada: jornada,
                    horas_planejadas: jornada * diasUteisMes,
                    horas_executadas: 0
                };
            }

            const feitas = Number(item.horasFeita ?? item.horas ?? 0);
            funcionarios[uid].horas_executadas += feitas;
        });

        const total_planejadas = Object.values(funcionarios).reduce((s, f) => s + (f.horas_planejadas || 0), 0);
        const total_executadas = Object.values(funcionarios).reduce((s, f) => s + (f.horas_executadas || 0), 0);

        // Se não houver planejadas, considera 0%
        let percentual = total_planejadas > 0 ? (total_executadas / total_planejadas) * 100 : 0;
        percentual = Math.min(percentual, 100); // opcional: limitar a 100%

        // Atualiza valor principal
        valueEl.textContent = percentual.toFixed(2).replace('.', ',') + '%';

        // Diferença em relação a 100%
        const diff = percentual - 100;
        const diffRounded = Math.abs(Math.round(diff));
        const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
        changeSpan.textContent = diff === 0 ? '0%' : `${sign}${diffRounded}%`;

        // Ícones e cores
        if (diff > 0) {
            changeEl.className = 'metric-change positive';
            changeIcon.className = 'fas fa-arrow-up';
        } else if (diff < 0) {
            changeEl.className = 'metric-change negative';
            changeIcon.className = 'fas fa-arrow-down';
        } else {
            changeEl.className = 'metric-change neutral';
            changeIcon.className = 'fas fa-minus';
        }

        // Tooltip opcional
        changeEl.title = `Executadas: ${total_executadas.toFixed(2)}h | Planejadas: ${total_planejadas.toFixed(2)}h`;

    } catch (err) {
        console.error("❗Erro na requisição:", err);

        // Se for 404 ou 400 com mensagem de "Nenhum apontamento encontrado", considera 0%
        if (err.response && (err.response.status === 404 || err.response.status === 400) &&
            err.response.data?.mensagem?.includes('Nenhum apontamento encontrado')) {
            valueEl.textContent = '0,00%';
            changeSpan.textContent = '0%';
            changeIcon.className = 'fas fa-minus';
            changeEl.className = 'metric-change neutral';
            return;
        }

        // Outros erros
        valueEl.textContent = '--';
        changeSpan.textContent = '--';
        changeIcon.className = 'fas fa-exclamation-triangle';
        changeEl.className = 'metric-change neutral';
    }
}

// Ajuste: usar total de horas extras do backend
async function loadKpiHorasExtras() {
    const diasUteisMes = 22; // dias úteis fixos
    const gerenteId = 2; // ajuste conforme necessário

    // Datas do mês atual
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const fmt = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const dataInicio = fmt(firstDay);
    const dataFim = fmt(lastDay);

    const endpoint = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;
    const endpointExtras = `/horas-extras/total-horas-extras/projetos-gerente/${gerenteId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;

    console.log("▶️ Requisição – endpoint (Horas Extras):", endpoint);
    console.log("▶️ Requisição – endpoint (Total Horas Extras):", endpointExtras);

    const card = document.getElementById('kpi_horas_extras');
    if (!card) return; // não há cartão na página

    const valueEl = card.querySelector('.metric-value');
    const changeEl = card.querySelector('.metric-change');
    const changeIcon = changeEl?.querySelector('i');
    const changeSpan = changeEl?.querySelector('span');

    try {
        // 1) Buscar apontamentos para derivar jornada planejada total
        const apontamentos = await get(endpoint);
        console.log("✅ Dados retornados (Horas Extras):", apontamentos);

        // Agrupa por funcionário para calcular jornada mensal planejada
        const funcionarios = {};
        apontamentos.forEach(item => {
            const user = item.projeto?.usuarios?.[0] || { id: item.usuarioId, nome: `Usuário ${item.usuarioId}`, jornada: item.jornada || 8 };
            if (!user) return;

            const uid = user.id;
            if (!funcionarios[uid]) {
                const jornada = Number(user.jornada || 8);
                funcionarios[uid] = {
                    nome: user.nome || `id_${uid}`,
                    jornada: jornada,
                    horas_planejadas: jornada * diasUteisMes
                };
            }
        });

        const total_planejadas = Object.values(funcionarios).reduce((s, f) => s + (f.horas_planejadas || 0), 0);

        // 2) Buscar total de horas extras do backend (HH:mm:ss)
        const respExtras = await get(endpointExtras);
        const total_extras = parseHHMMSStoHours(respExtras?.horaExtra);
        console.log(`🧮 Total de horas extras (backend): ${respExtras?.horaExtra} = ${total_extras.toFixed(2)}h`);
        console.log(`🧮 Jornada total planejada: ${total_planejadas.toFixed(2)}h`);

        // Percentual de horas extras sobre a jornada mensal total
        let percentualExtras = total_planejadas > 0 ? (total_extras / total_planejadas) * 100 : 0;
        percentualExtras = Math.max(0, percentualExtras);

        // Atualiza valor principal (formatando com vírgula)
        valueEl.textContent = percentualExtras.toFixed(2).replace('.', ',') + '%';

        // Mostra mudança — para este KPI mostramos o próprio percentual arredondado
        const rounded = Math.round(percentualExtras);
        const sign = percentualExtras > 0 ? '+' : '';
        if (changeSpan) changeSpan.textContent = percentualExtras > 0 ? `${sign}${rounded}%` : '0%';

        // Ícones e cores
        if (percentualExtras > 0) {
            if (changeEl) changeEl.className = 'metric-change positive';
            if (changeIcon) changeIcon.className = 'fas fa-arrow-up';
        } else {
            if (changeEl) changeEl.className = 'metric-change neutral';
            if (changeIcon) changeIcon.className = 'fas fa-minus';
        }

        // Tooltip com valores absolutos
        if (changeEl) changeEl.title = `Horas extras: ${total_extras.toFixed(2)}h | Jornada total: ${total_planejadas.toFixed(2)}h`;

    } catch (err) {
        console.error("❗Erro na requisição (Horas Extras):", err);

        if (valueEl) valueEl.textContent = '--';
        if (changeSpan) changeSpan.textContent = '--';
        if (changeIcon) changeIcon.className = 'fas fa-exclamation-triangle';
        if (changeEl) changeEl.className = 'metric-change neutral';
    }
}

async function loadKpiMediaHorasExtrasPorColaborador() {
    const diasUteisMes = 22; // dias úteis fixos
    const gerenteId = 2; // ajuste conforme necessário

    // Datas do mês atual
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const fmt = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const dataInicio = fmt(firstDay);
    const dataFim = fmt(lastDay);
    const endpoint = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;
    const endpointExtras = `/horas-extras/total-horas-extras/projetos-gerente/${gerenteId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;

    const card = document.getElementById('kpi_media_horas_extras');
    if (!card) return;

    const valueEl = card.querySelector('.metric-value');
    const changeEl = card.querySelector('.metric-change');
    const changeIcon = changeEl?.querySelector('i');
    const changeSpan = changeEl?.querySelector('span');

    const hoursToHHMMSS = (hours) => {
        const totalSeconds = Math.max(0, Math.round(hours * 3600));
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return `${h}:${pad(m)}:${pad(s)}`;
    };

    try {
        // Buscar apontamentos para derivar colaboradores e jornada total
        const apontamentos = await get(endpoint);

        // Mapa com jornada e nome por usuário
        const funcionarios = {};
        apontamentos.forEach(item => {
            const user = item.projeto?.usuarios?.[0] || { id: item.usuarioId, nome: `Usuário ${item.usuarioId}`, jornada: item.jornada || 8 };
            if (!user) return;
            const uid = user.id;
            if (!funcionarios[uid]) {
                funcionarios[uid] = {
                    nome: user.nome || `id_${uid}`,
                    jornada: Number(user.jornada || 8),
                    horas_planejadas: Number(user.jornada || 8) * diasUteisMes
                };
            }
        });

        const total_users = Object.keys(funcionarios).length;
        const total_planejadas = Object.values(funcionarios).reduce((s, f) => s + (f.horas_planejadas || 0), 0);

        // Buscar total de horas extras do backend (HH:mm:ss)
        const respExtras = await get(endpointExtras);
        const total_extras = parseHHMMSStoHours(respExtras?.horaExtra);
        console.log(`🧮 Total de horas extras (backend): ${respExtras?.horaExtra} = ${total_extras.toFixed(2)}h | Colaboradores: ${total_users}`);

        // Média por colaborador
        const mediaHorasExtras = total_users > 0 ? total_extras / total_users : 0;

        // Atualiza UI
        valueEl.textContent = hoursToHHMMSS(mediaHorasExtras);
        if (changeSpan) changeSpan.textContent = '0%';
        if (changeEl) changeEl.className = 'metric-change neutral';
        if (changeIcon) changeIcon.className = 'fas fa-minus';

        // Tooltip
        if (changeEl) changeEl.title = `Média: ${hoursToHHMMSS(mediaHorasExtras)} | Extras totais: ${total_extras.toFixed(2)}h | Colaboradores: ${total_users} | Jornada total: ${total_planejadas.toFixed(2)}h`;

        // Logs
        console.log(`🧮 Média de horas extras por colaborador = total_extras / colaboradores = ${total_extras.toFixed(2)} / ${total_users} = ${mediaHorasExtras.toFixed(2)}h (${hoursToHHMMSS(mediaHorasExtras)})`);

    } catch (err) {
        console.error("❗Erro na requisição (Média Horas Extras):", err);
        if (valueEl) valueEl.textContent = '0:00:00';
        if (changeSpan) changeSpan.textContent = '--';
        if (changeIcon) changeIcon.className = 'fas fa-exclamation-triangle';
        if (changeEl) changeEl.className = 'metric-change neutral';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadKpiPlanejadasVsExecutadas();
    loadKpiHorasExtras();
    loadKpiMediaHorasExtrasPorColaborador(); 
});
