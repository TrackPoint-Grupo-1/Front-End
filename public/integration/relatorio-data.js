import { get, post } from "./connection.js";

// Função para carregar dados de relatórios
export async function carregarDadosRelatorio(usuarioId, data) {
    try {
        const [pontos, apontamentos, horasExtras] = await Promise.allSettled([
            carregarPontosDoDia(usuarioId, data),
            carregarApontamentosDoDia(usuarioId, data),
            carregarHorasExtrasDoDia(usuarioId, data)
        ]);

        return {
            pontos: pontos.status === 'fulfilled' ? pontos.value : [],
            apontamentos: apontamentos.status === 'fulfilled' ? apontamentos.value : [],
            horasExtras: horasExtras.status === 'fulfilled' ? horasExtras.value : null
        };

    } catch (error) {
        console.error("Erro ao carregar dados do relatório:", error);
        return { pontos: [], apontamentos: [], horasExtras: null };
    }
}

async function carregarPontosDoDia(usuarioId, data) {
    const encodedDate = encodeURIComponent(data);
    return await get(`/pontos/${usuarioId}?data=${encodedDate}`);
}

async function carregarApontamentosDoDia(usuarioId, data) {
    const encodedDate = encodeURIComponent(data);
    return await get(`/apontamento-horas/usuario/${usuarioId}?data=${encodedDate}`);
}

async function carregarHorasExtrasDoDia(usuarioId, data) {
    const [dia, mes, ano] = data.split('/');
    const dataInicio = `${dia}/${mes}/${ano}`;
    const dataFim = `${dia}/${mes}/${ano}`;
    
    const encodedInicio = encodeURIComponent(dataInicio);
    const encodedFim = encodeURIComponent(dataFim);
    
    return await get(`/horas-extras/listar-horas/${usuarioId}?dataInicio=${encodedInicio}&dataFim=${encodedFim}`);
}

// Função para exportar relatório
export async function exportarRelatorio(usuarioId, dataInicio, dataFim, formato = 'json') {
    try {
        const dados = await carregarDadosRelatorio(usuarioId, dataInicio, dataFim);
        
        if (formato === 'json') {
            return exportarJSON(dados);
        } else if (formato === 'csv') {
            return exportarCSV(dados);
        } else if (formato === 'pdf') {
            return exportarPDF(dados);
        }
        
    } catch (error) {
        console.error("Erro ao exportar relatório:", error);
        throw error;
    }
}

// Função removida - estava duplicada com a exportada acima

async function carregarPontosPorPeriodo(usuarioId, dataInicio, dataFim) {
    const encodedInicio = encodeURIComponent(dataInicio);
    const encodedFim = encodeURIComponent(dataFim);
    return await get(`/pontos/${usuarioId}/periodo?dataInicio=${encodedInicio}&dataFim=${encodedFim}`);
}

async function carregarApontamentosPorPeriodo(usuarioId, dataInicio, dataFim) {
    const encodedInicio = encodeURIComponent(dataInicio);
    const encodedFim = encodeURIComponent(dataFim);
    return await get(`/apontamento-horas/usuario/${usuarioId}?dataInicio=${encodedInicio}&dataFim=${encodedFim}`);
}

async function carregarHorasExtrasPorPeriodo(usuarioId, dataInicio, dataFim) {
    const encodedInicio = encodeURIComponent(dataInicio);
    const encodedFim = encodeURIComponent(dataFim);
    return await get(`/horas-extras/listar-horas/${usuarioId}?dataInicio=${encodedInicio}&dataFim=${encodedFim}`);
}

function exportarJSON(dados) {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportarCSV(dados) {
    let csv = 'Data,Tipo,Horario,Observacoes\n';
    
    // Adicionar pontos
    if (dados.pontos && Array.isArray(dados.pontos)) {
        dados.pontos.forEach(ponto => {
            const data = new Date(ponto.horario).toLocaleDateString('pt-BR');
            const horario = new Date(ponto.horario).toLocaleTimeString('pt-BR');
            csv += `${data},${ponto.tipo},${horario},"${ponto.observacoes || ''}"\n`;
        });
    }
    
    // Adicionar apontamentos
    if (dados.apontamentos && Array.isArray(dados.apontamentos)) {
        dados.apontamentos.forEach(apontamento => {
            csv += `${apontamento.data},${apontamento.acao},${apontamento.horas}h,"${apontamento.descricao || ''}"\n`;
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportarPDF(dados) {
    // Implementação básica de PDF - em produção, use uma biblioteca como jsPDF
    const conteudo = `
        Relatório de Pontos e Apontamentos
        Data: ${new Date().toLocaleDateString('pt-BR')}
        
        PONTOS:
        ${dados.pontos ? dados.pontos.map(p => `${p.tipo}: ${new Date(p.horario).toLocaleTimeString('pt-BR')}`).join('\n') : 'Nenhum ponto encontrado'}
        
        APONTAMENTOS:
        ${dados.apontamentos ? dados.apontamentos.map(a => `${a.acao}: ${a.horas}h - ${a.descricao}`).join('\n') : 'Nenhum apontamento encontrado'}
    `;
    
    const blob = new Blob([conteudo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Função para validar dados de relatório
export function validarDadosRelatorio(dados) {
    const erros = [];
    
    if (!dados.pontos || !Array.isArray(dados.pontos)) {
        erros.push('Dados de pontos inválidos');
    }
    
    if (!dados.apontamentos || !Array.isArray(dados.apontamentos)) {
        erros.push('Dados de apontamentos inválidos');
    }
    
    return {
        valido: erros.length === 0,
        erros: erros
    };
}

// Função para calcular estatísticas do relatório
export function calcularEstatisticas(dados) {
    const stats = {
        totalPontos: dados.pontos ? dados.pontos.length : 0,
        totalApontamentos: dados.apontamentos ? dados.apontamentos.length : 0,
        totalHoras: 0,
        projetos: new Set()
    };
    
    // Calcular total de horas dos apontamentos
    if (dados.apontamentos) {
        dados.apontamentos.forEach(apontamento => {
            stats.totalHoras += apontamento.horas || 0;
            if (apontamento.projeto) {
                stats.projetos.add(apontamento.projeto.nome || apontamento.projeto);
            }
        });
    }
    
    stats.projetos = Array.from(stats.projetos);
    
    return stats;
}

// Inicializar quando o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
    // Adicionar botões de exportação se não existirem
    adicionarBotoesExportacao();
});

function adicionarBotoesExportacao() {
    const relatoriosContainer = document.querySelector('.container-relatorios');
    if (!relatoriosContainer) return;
    
    const botoesContainer = document.createElement('div');
    botoesContainer.className = 'export-buttons';
    botoesContainer.style.cssText = `
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        justify-content: flex-end;
    `;
    
    const botaoJSON = document.createElement('button');
    botaoJSON.textContent = 'Exportar JSON';
    botaoJSON.className = 'btn btn-secondary';
    botaoJSON.addEventListener('click', () => exportarRelatorioAtual('json'));
    
    const botaoCSV = document.createElement('button');
    botaoCSV.textContent = 'Exportar CSV';
    botaoCSV.className = 'btn btn-secondary';
    botaoCSV.addEventListener('click', () => exportarRelatorioAtual('csv'));
    
    const botaoPDF = document.createElement('button');
    botaoPDF.textContent = 'Exportar PDF';
    botaoPDF.className = 'btn btn-secondary';
    botaoPDF.addEventListener('click', () => exportarRelatorioAtual('pdf'));
    
    botoesContainer.appendChild(botaoJSON);
    botoesContainer.appendChild(botaoCSV);
    botoesContainer.appendChild(botaoPDF);
    
    relatoriosContainer.insertBefore(botoesContainer, relatoriosContainer.firstChild);
}

async function exportarRelatorioAtual(formato) {
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioLogado.id) {
            alert('Usuário não encontrado. Faça login novamente.');
            return;
        }
        
        const dataInput = document.getElementById('date-input');
        if (!dataInput || !dataInput.value) {
            alert('Selecione uma data para exportar o relatório.');
            return;
        }
        
        await exportarRelatorio(usuarioLogado.id, dataInput.value, dataInput.value, formato);
        alert('Relatório exportado com sucesso!');
        
    } catch (error) {
        console.error("Erro ao exportar relatório:", error);
        alert('Erro ao exportar relatório. Tente novamente.');
    }
}