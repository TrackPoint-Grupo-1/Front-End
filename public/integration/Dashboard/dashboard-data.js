import { get } from "../connection.js";

// Função para carregar dados do dashboard do manager
export async function carregarDadosDashboard(gerenteId) {
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioLogado.id) {
            console.error("Usuário não encontrado no localStorage.");
            return;
        }

        // Carregar dados em paralelo
        const [
            metricasGerais,
            solicitacoesHorasExtras,
            solicitacoesAjustes,
            rankingFuncionarios
        ] = await Promise.allSettled([
            carregarMetricasGerais(gerenteId),
            carregarSolicitacoesHorasExtras(gerenteId),
            carregarSolicitacoesAjustes(gerenteId),
            carregarRankingFuncionarios(gerenteId)
        ]);

        // Processar resultados
        if (metricasGerais.status === 'fulfilled') {
            atualizarMetricasGerais(metricasGerais.value);
        }

        if (solicitacoesHorasExtras.status === 'fulfilled') {
            atualizarSolicitacoesHorasExtras(solicitacoesHorasExtras.value);
        }

        if (solicitacoesAjustes.status === 'fulfilled') {
            atualizarSolicitacoesAjustes(solicitacoesAjustes.value);
        }

        if (rankingFuncionarios.status === 'fulfilled') {
            atualizarRankingFuncionarios(rankingFuncionarios.value);
        }

    } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
    }
}

async function carregarMetricasGerais(gerenteId) {
    const { inicio, fim } = getInicioEFimDoMesAtual();
    
    const endpoint = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(inicio)}&datafim=${encodeURIComponent(fim)}`;
    return await get(endpoint);
}

async function carregarSolicitacoesHorasExtras(gerenteId) {
    const endpoint = `/horas-extras/solicitacoes-pendentes/gerente/${gerenteId}`;
    return await get(endpoint);
}

async function carregarSolicitacoesAjustes(gerenteId) {
    const endpoint = `/solicitacoes/gestor/${gerenteId}`;
    return await get(endpoint);
}

async function carregarRankingFuncionarios(gerenteId) {
    const endpoint = `/horas-extras/ranking-geral`;
    return await get(endpoint);
}

function getInicioEFimDoMesAtual() {
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatar = (d) =>
        d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    return {
        inicio: formatar(inicio),
        fim: formatar(fim),
    };
}

function atualizarMetricasGerais(apontamentos) {
    if (!Array.isArray(apontamentos)) return;

    const totalHoras = apontamentos.reduce((acc, item) => acc + (item.horasFeita || 0), 0);
    
    // Atualizar métrica de horas trabalhadas
    const metricCard = document.querySelector('.metric-card');
    if (metricCard) {
        const metricValue = metricCard.querySelector('.metric-value');
        if (metricValue) {
            const horas = Math.floor(totalHoras);
            const minutos = Math.round((totalHoras - horas) * 60);
            const segundos = 0;
            const formatado = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
            metricValue.textContent = formatado;
        }
    }
}

function atualizarSolicitacoesHorasExtras(solicitacoes) {
    // Esta função será chamada pelo módulo específico de horas extras
    console.log("Solicitações de horas extras carregadas:", solicitacoes);
}

function atualizarSolicitacoesAjustes(solicitacoes) {
    // Esta função será chamada pelo módulo específico de ajustes
    console.log("Solicitações de ajustes carregadas:", solicitacoes);
}

function atualizarRankingFuncionarios(ranking) {
    if (!Array.isArray(ranking)) return;

    // Criar ou atualizar seção de ranking se existir
    const rankingSection = document.querySelector('.ranking-section');
    if (rankingSection) {
        const tbody = rankingSection.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            ranking.slice(0, 5).forEach((funcionario, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${funcionario.nome || 'N/A'}</td>
                    <td>${funcionario.totalHoras || '0h'}</td>
                    <td>${funcionario.projetos || '0'}</td>
                `;
                tbody.appendChild(row);
            });
        }
    }
}

// Função para atualizar dados em tempo real
export async function atualizarDadosTempoReal(gerenteId) {
    try {
        await carregarDadosDashboard(gerenteId);
    } catch (error) {
        console.error("Erro ao atualizar dados em tempo real:", error);
    }
}

// Inicializar quando o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (usuarioLogado && usuarioLogado.id) {
        carregarDadosDashboard(usuarioLogado.id);
        
        // Atualizar a cada 5 minutos
        setInterval(() => {
            carregarDadosDashboard(usuarioLogado.id);
        }, 300000);
    }
});
