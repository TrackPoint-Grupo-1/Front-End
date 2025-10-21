import { get } from "../connection.js";

document.addEventListener("DOMContentLoaded", async function () {
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioLogado.id) {
            console.error("Usuário não encontrado no localStorage.");
            return;
        }

        // Carregar dados do usuário e pontos
        await carregarDadosUsuario(usuarioLogado.id);
        await carregarPontosFaltantes(usuarioLogado.id);

    } catch (error) {
        console.error("Erro ao carregar descrições:", error);
    }
});

async function carregarDadosUsuario(usuarioId) {
    try {
        // Buscar dados do usuário
        const usuario = await get(`/usuarios/${usuarioId}`);
        
        if (usuario) {
            // Atualizar informações do usuário na interface
            const nomeElement = document.querySelector('.card-user h2');
            if (nomeElement) {
                nomeElement.textContent = usuario.nome || "Usuário";
            }

            const fotoElement = document.querySelector('.card-user img');
            if (fotoElement && usuario.foto) {
                fotoElement.src = usuario.foto;
            }
        }

    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
    }
}

async function carregarPontosFaltantes(usuarioId) {
    try {
        // Buscar pontos faltantes do usuário
        const pontosFaltantes = await get(`/pontos/${usuarioId}/faltantes`);
        
        if (pontosFaltantes && Array.isArray(pontosFaltantes) && pontosFaltantes.length > 0) {
            // Exibir notificação de pontos faltantes
            exibirNotificacaoPontosFaltantes(pontosFaltantes);
        }

    } catch (error) {
        console.error("Erro ao carregar pontos faltantes:", error);
        // Não exibir erro para o usuário, apenas log
    }
}

function exibirNotificacaoPontosFaltantes(pontosFaltantes) {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = 'notificacao-pontos-faltantes';
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        padding: 16px;
        max-width: 300px;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    const titulo = document.createElement('h4');
    titulo.textContent = 'Pontos Faltantes';
    titulo.style.cssText = `
        margin: 0 0 8px 0;
        color: #92400e;
        font-size: 14px;
        font-weight: 600;
    `;

    const lista = document.createElement('ul');
    lista.style.cssText = `
        margin: 0;
        padding-left: 16px;
        color: #92400e;
        font-size: 13px;
    `;

    pontosFaltantes.forEach(ponto => {
        const item = document.createElement('li');
        item.textContent = `${ponto.data} - ${ponto.tipo}`;
        lista.appendChild(item);
    });

    const botaoFechar = document.createElement('button');
    botaoFechar.textContent = '×';
    botaoFechar.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        color: #92400e;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    botaoFechar.addEventListener('click', () => {
        notificacao.remove();
    });

    notificacao.appendChild(titulo);
    notificacao.appendChild(lista);
    notificacao.appendChild(botaoFechar);

    document.body.appendChild(notificacao);

    // Remover automaticamente após 10 segundos
    setTimeout(() => {
        if (notificacao.parentNode) {
            notificacao.remove();
        }
    }, 10000);
}

// Função para atualizar status dos pontos em tempo real
async function atualizarStatusPontos(usuarioId) {
    try {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, "0");
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = hoje.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;

        const pontos = await get(`/pontos/${usuarioId}?data=${encodeURIComponent(dataFormatada)}`);
        
        // Atualizar interface com status dos pontos
        atualizarInterfacePontos(pontos);

    } catch (error) {
        console.error("Erro ao atualizar status dos pontos:", error);
    }
}

function atualizarInterfacePontos(pontos) {
    const mapeamentoPontos = {
        'ENTRADA': { elemento: '.row-card:nth-child(1) span', label: 'Entrada' },
        'ALMOCO': { elemento: '.row-card:nth-child(2) span', label: 'Início de Intervalo' },
        'VOLTA_ALMOCO': { elemento: '.row-card:nth-child(3) span', label: 'Volta do Intervalo' },
        'SAIDA': { elemento: '.row-card:nth-child(4) span', label: 'Saída' }
    };

    // Limpar todos os pontos primeiro
    Object.values(mapeamentoPontos).forEach(({ elemento }) => {
        const el = document.querySelector(elemento);
        if (el) {
            el.textContent = '--:--';
            el.className = 'ponto-nao_batido';
        }
    });

    // Preencher pontos existentes
    if (pontos && Array.isArray(pontos)) {
        pontos.forEach(ponto => {
            const config = mapeamentoPontos[ponto.tipo];
            if (config) {
                const elemento = document.querySelector(config.elemento);
                if (elemento) {
                    const horario = new Date(ponto.horario);
                    const horaLocal = horario.toLocaleTimeString("pt-BR", { 
                        hour: "2-digit", 
                        minute: "2-digit", 
                        hour12: false,
                        timeZone: "America/Sao_Paulo"
                    });
                    
                    elemento.textContent = horaLocal;
                    elemento.className = 'ponto-batido';
                }
            }
        });
    }
}

// Exportar função para uso em outros módulos
window.atualizarStatusPontos = atualizarStatusPontos;