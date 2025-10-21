import { get } from "../connection.js";

document.addEventListener("DOMContentLoaded", async function () {
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioLogado.id) {
            console.error("Usuário não encontrado no localStorage.");
            return;
        }

        // Atualizar nome do usuário
        const nomeUsuario = document.querySelector('.card-user h2');
        if (nomeUsuario) {
            nomeUsuario.textContent = usuarioLogado.nome || "Usuário";
        }

        // Atualizar foto do usuário se disponível
        const fotoUsuario = document.querySelector('.card-user img');
        if (fotoUsuario && usuarioLogado.foto) {
            fotoUsuario.src = usuarioLogado.foto;
        }

        // Carregar pontos do dia atual
        await carregarPontosDoDia(usuarioLogado.id);

        // Atualizar data e horário atual
        atualizarDataHora();

        // Atualizar a cada minuto
        setInterval(atualizarDataHora, 60000);

    } catch (error) {
        console.error("Erro ao carregar dados da agenda:", error);
    }
});

async function carregarPontosDoDia(usuarioId) {
    try {
        // Data atual no formato dd/MM/yyyy
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, "0");
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = hoje.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;

        // Buscar pontos do dia
        const pontos = await get(`/pontos/${usuarioId}?data=${encodeURIComponent(dataFormatada)}`);

        // Mapear tipos de ponto para elementos da interface
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
                        // Converter horário para formato local
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

        // Calcular e exibir break se houver entrada e almoço
        await calcularBreak(usuarioId, pontos);

    } catch (error) {
        console.error("Erro ao carregar pontos do dia:", error);
        
        // Em caso de erro, mostrar mensagem amigável
        const elementos = document.querySelectorAll('.row-card span');
        elementos.forEach(el => {
            if (el.textContent === '--:--') {
                el.textContent = 'Erro ao carregar';
                el.className = 'ponto-erro';
            }
        });
    }
}

async function calcularBreak(usuarioId, pontos) {
    try {
        if (!pontos || !Array.isArray(pontos)) return;

        const entrada = pontos.find(p => p.tipo === 'ENTRADA');
        const almoco = pontos.find(p => p.tipo === 'ALMOCO');
        const voltaAlmoco = pontos.find(p => p.tipo === 'VOLTA_ALMOCO');

        if (entrada && almoco) {
            const horarioEntrada = new Date(entrada.horario);
            const horarioAlmoco = new Date(almoco.horario);
            
            const diffMs = horarioAlmoco - horarioEntrada;
            const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            const breakText = `${String(diffHoras).padStart(2, '0')}:${String(diffMinutos).padStart(2, '0')}`;
            
            const breakElement = document.querySelector('.card-user span');
            if (breakElement) {
                breakElement.textContent = `Seu break foi de ${breakText}`;
            }
        } else if (entrada) {
            // Se só tem entrada, calcular tempo até agora
            const agora = new Date();
            const horarioEntrada = new Date(entrada.horario);
            
            const diffMs = agora - horarioEntrada;
            const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            const breakText = `${String(diffHoras).padStart(2, '0')}:${String(diffMinutos).padStart(2, '0')}`;
            
            const breakElement = document.querySelector('.card-user span');
            if (breakElement) {
                breakElement.textContent = `Trabalhando há ${breakText}`;
            }
        }

    } catch (error) {
        console.error("Erro ao calcular break:", error);
    }
}

function atualizarDataHora() {
    const agora = new Date();
    
    // Atualizar data
    const dataElement = document.querySelector('.hours .data');
    if (dataElement) {
        const opcoesData = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            locale: 'pt-BR'
        };
        dataElement.textContent = agora.toLocaleDateString('pt-BR', opcoesData);
    }
    
    // Atualizar horário
    const horarioElement = document.querySelector('.hours h1');
    if (horarioElement) {
        const opcoesHora = { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false,
            timeZone: "America/Sao_Paulo"
        };
        horarioElement.textContent = agora.toLocaleTimeString('pt-BR', opcoesHora);
    }
}