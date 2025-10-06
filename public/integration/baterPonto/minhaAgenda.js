import { get } from "../connection.js";

document.addEventListener("DOMContentLoaded", async () => {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuarioLogado) {
        console.error("Nenhum usuário logado encontrado no localStorage.");
        return;
    }

    function getDataHojeFormatada() {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, "0");
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = hoje.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    const dataHoje = getDataHojeFormatada();

    try {
        const endpoint = `/pontos/${usuarioLogado.id}?data=${encodeURIComponent(dataHoje)}`;
        const pontos = await get(endpoint);

        // 👇 LOGA A URL FINAL
        console.log("Chamando endpoint:", endpoint);


        if (!pontos.length) {
            console.log("Nenhum ponto encontrado para hoje.");
        }

        // --- Agrupa pontos por turno ---
        const pontosPorTurno = {};
        pontos.forEach(ponto => {
            if (!pontosPorTurno[ponto.turno]) pontosPorTurno[ponto.turno] = [];
            pontosPorTurno[ponto.turno].push(ponto);
        });

        // --- Seleciona o turno mais recente ---
        const turnos = Object.keys(pontosPorTurno);
        const turnoAtual = turnos.length > 0 ? pontosPorTurno[turnos[turnos.length - 1]] : [];

        // --- Inicializa horários com "--:--" ---
        const horarios = {
            ENTRADA: "--:--",
            ALMOCO: "--:--",
            VOLTA_ALMOCO: "--:--",
            SAIDA: "--:--"
        };

        // Preenche os horários batidos (com ajuste de fuso horário)
        turnoAtual.forEach(ponto => {
            const horario = new Date(ponto.horario);
            const horaLocal = horario.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo"
            });
            horarios[ponto.tipo] = horaLocal; // ✅ usa apenas o valor ajustado
        });


        // --- Regra do Planejado ---
        let voltaAlmocoHtml = horarios.VOLTA_ALMOCO;
        if (horarios.ALMOCO !== "--:--" && horarios.VOLTA_ALMOCO === "--:--") {
            const [h, m] = horarios.ALMOCO.split(":").map(Number);
            const planejado = new Date();
            planejado.setHours(h, m, 0, 0);
            planejado.setHours(planejado.getHours() + 1);

            const planejadoFormatado = `${String(planejado.getHours()).padStart(2, "0")}:${String(planejado.getMinutes()).padStart(2, "0")}`;

            voltaAlmocoHtml = `<span class="ponto-nao_batido"><span>Planejado</span><span>${planejadoFormatado}</span></span>`;
        }

        // --- Atualiza HTML ---
        const entradaSpan = document.querySelector(".row-card:nth-child(1) span");
        const almocoSpan = document.querySelector(".row-card:nth-child(2) span");
        const voltaAlmocoSpan = document.querySelector(".row-card:nth-child(3) span");
        const saidaSpan = document.querySelector(".row-card:nth-child(4) span");

        entradaSpan.textContent = horarios.ENTRADA;
        almocoSpan.textContent = horarios.ALMOCO;

        if (horarios.ALMOCO !== "--:--" && horarios.VOLTA_ALMOCO === "--:--") {
            voltaAlmocoSpan.innerHTML = voltaAlmocoHtml; // planejado
        } else {
            voltaAlmocoSpan.textContent = horarios.VOLTA_ALMOCO; // horário real ou --
        }

        saidaSpan.textContent = horarios.SAIDA;

        console.log("Turno atual:", turnoAtual);

    } catch (error) {
        console.error("Erro ao carregar a agenda:", error.message);
    }
});
