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
        if (typeof decimal !== "number" || isNaN(decimal)) return "00:00";
        const horas = Math.floor(decimal);
        const minutos = Math.round((decimal - horas) * 60);
        return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
    }

    // Nova: normaliza diferentes formatos de total de horas para decimal (horas).
    function normalizeHoras(valor) {
        if (valor == null) return 0;
        // já é número decimal
        if (typeof valor === "number" && !isNaN(valor)) return valor;
        // objeto possivelmente com propriedades diferentes
        if (typeof valor === "object") {
            // exemplos: { totalHoras: 8.5 } ou { horas: "08:30" } etc.
            const candidates = ["totalHoras", "horas", "total", "horasTotal"];
            for (const key of candidates) {
                if (key in valor) {
                    return normalizeHoras(valor[key]);
                }
            }
            return 0;
        }
        // string no formato "HH:MM"
        if (typeof valor === "string") {
            const hhmm = valor.trim();
            // se já estiver no formato "HH:MM"
            const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
            if (match) {
                const h = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                return h + m / 60;
            }
            // string numérica "8.5"
            const num = parseFloat(hhmm.replace(",", "."));
            if (!isNaN(num)) return num;
        }
        return 0;
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
        // --- Horas extras (isolado) ---
        try {
            const endpointHorasExtras = `/horas-extras/listar-horas/${usuarioLogado.id}?dataInicio=${encodeURIComponent(
                dataInicio
            )}&dataFim=${encodeURIComponent(dataFim)}`;
            console.log("endpointHorasExtras:", endpointHorasExtras);
            const resultadoHorasExtras = await get(endpointHorasExtras);
            console.log("API horas extras:", resultadoHorasExtras);
            const rawHorasExtras = resultadoHorasExtras?.horasTotal?.totalHoras ?? resultadoHorasExtras?.totalHoras ?? resultadoHorasExtras;
            const totalHorasExtras = normalizeHoras(rawHorasExtras);
            const limiteHorasExtras = normalizeHoras(usuarioLogado.limiteHorasExtrasMes ?? 0);

            const elHorasExtras = document.querySelector("#horasExtras");
            const elLimiteHorasExtras = document.querySelector("#limiteHorasExtras");
            if (elHorasExtras) elHorasExtras.textContent = formatarHorasDecimais(totalHorasExtras);
            else console.warn("#horasExtras não encontrado no DOM.");

            if (elLimiteHorasExtras) elLimiteHorasExtras.textContent = `Limite de ${formatarHorasDecimais(limiteHorasExtras)}`;
            else console.warn("#limiteHorasExtras não encontrado no DOM.");
        } catch (err) {
            console.error("Erro ao buscar horas extras:", err?.message ?? err);
        }

        // --- Total de horas trabalhadas (isolado) ---
        const endpointPontos = `/pontos/${usuarioLogado.id}/periodo?dataInicio=${encodeURIComponent(
            dataInicio
        )}&dataFim=${encodeURIComponent(dataFim)}`;
        console.log("endpointPontos:", endpointPontos); // <- adicionado para aparecer no console
        try {
            const resultadoPontos = await get(endpointPontos);
            console.log("API pontos período:", resultadoPontos);
            // Tenta várias formas de extrair o total
            const rawTotalPontos = resultadoPontos?.horasTotal?.totalHoras ?? resultadoPontos?.totalHoras ?? resultadoPontos?.total ?? resultadoPontos;
            const totalHorasTrabalhadas = normalizeHoras(rawTotalPontos);

            const elHorasTotal = document.querySelector("#horasTotal");
            if (elHorasTotal) elHorasTotal.textContent = formatarHorasDecimais(totalHorasTrabalhadas);
            else console.warn("#horasTotal não encontrado no DOM.");

            const diasUteis = contarDiasUteis(primeiroDiaObj, ultimoDiaObj);
            const limiteHorasTrabalhadas = normalizeHoras(usuarioLogado.jornada ?? 0) * diasUteis;
            const elLimiteHorasTrabalhadas = document.querySelector("#limiteHorasTrabalhadas");
            if (elLimiteHorasTrabalhadas) elLimiteHorasTrabalhadas.textContent = `de ${formatarHorasDecimais(limiteHorasTrabalhadas)}`;
            else console.warn("#limiteHorasTrabalhadas não encontrado no DOM.");

            // Opcional: mostrar lista de pontos no console
            console.log("Pontos do período (raw):", resultadoPontos.listaHoras ?? resultadoPontos);
        } catch (err) {
            console.error("Erro ao buscar pontos:", err?.message ?? err);
        }
    } catch (error) {
        console.error("Erro inesperado:", error?.message ?? error);
    }
});
