import { get } from "../connection.js";

document.addEventListener("DOMContentLoaded", async () => {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuarioLogado) {
        console.error("Nenhum usuário logado encontrado no localStorage.");
        return;
    }

    document.getElementById("user").textContent = usuarioLogado.nome.toUpperCase();

    function getDatasMesAtual() {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth();

        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);

        const formatar = (data) =>
            `${String(data.getDate()).padStart(2, "0")}/${String(
                data.getMonth() + 1
            ).padStart(2, "0")}/${data.getFullYear()}`;

        return {
            dataInicio: formatar(primeiroDia),
            dataFim: formatar(ultimoDia),
            primeiroDiaObj: primeiroDia,
            ultimoDiaObj: ultimoDia
        };
    }

    const { dataInicio, dataFim, primeiroDiaObj, ultimoDiaObj } = getDatasMesAtual();

    function formatarHorasDecimais(decimal) {
        const horas = Math.floor(decimal);
        const minutos = Math.round((decimal - horas) * 60);
        return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
    }

    function contarDiasUteis(dataInicio, dataFim) {
        let count = 0;
        let dia = new Date(dataInicio);
        while (dia <= dataFim) {
            const diaSemana = dia.getDay(); // 0 = Domingo, 6 = Sábado
            if (diaSemana !== 0 && diaSemana !== 6) count++;
            dia.setDate(dia.getDate() + 1);
        }
        return count;
    }

    try {
        // --- Horas extras ---
        const endpointHorasExtras = `/horas-extras/listar-horas/${usuarioLogado.id}?dataInicio=${encodeURIComponent(
            dataInicio
        )}&dataFim=${encodeURIComponent(dataFim)}`;
        const resultadoHorasExtras = await get(endpointHorasExtras);

        const totalHorasExtras = resultadoHorasExtras.horasTotal.totalHoras ?? 0;
        const limiteHorasExtras = usuarioLogado.limiteHorasExtrasMes ?? 0;

        document.querySelector("#horasExtras").textContent = formatarHorasDecimais(totalHorasExtras);
        document.querySelector("#limiteHorasExtras").textContent = `Limite de ${formatarHorasDecimais(limiteHorasExtras)}`;

        // --- Total de horas trabalhadas ---
        const endpointPontos = `/pontos/${usuarioLogado.id}/periodo?dataInicio=${encodeURIComponent(
            dataInicio
        )}&dataFim=${encodeURIComponent(dataFim)}`;
        const resultadoPontos = await get(endpointPontos);

        const totalHorasTrabalhadas = resultadoPontos.horasTotal.totalHoras ?? 0;
        document.querySelector("#horasTotal").textContent = formatarHorasDecimais(totalHorasTrabalhadas);

        const diasUteis = contarDiasUteis(primeiroDiaObj, ultimoDiaObj);
        const limiteHorasTrabalhadas = usuarioLogado.jornada * diasUteis;
        document.querySelector("#limiteHorasTrabalhadas").textContent = `de ${formatarHorasDecimais(limiteHorasTrabalhadas)}`;

        // Opcional: mostrar lista de pontos no console
        console.log("Pontos do período:", resultadoPontos.listaHoras);

    } catch (error) {
        console.error("Erro:", error.message);
    }
});
