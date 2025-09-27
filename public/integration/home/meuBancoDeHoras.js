import { get } from "../connection.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Recupera o usuário logado
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuarioLogado) {
        console.error("Nenhum usuário logado encontrado no localStorage.");
        return;
    }

    document.getElementById("user").textContent = usuarioLogado.nome.toUpperCase();

    // 2. Função para pegar o primeiro e último dia do mês atual
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
        };
    }

    const { dataInicio, dataFim } = getDatasMesAtual();

    try {
        // usando a função genérica GET do connection.js
        const endpoint = `/horas-extras/listar-horas/${usuarioLogado.id}?dataInicio=${encodeURIComponent(
            dataInicio
        )}&dataFim=${encodeURIComponent(dataFim)}`;

        const resultado = await get(endpoint);

        const totalHorasExtras = resultado.horasTotal.totalHoras ?? 0;
        const limite = usuarioLogado.limiteHorasExtrasMes ?? 0;

        function formatarHorasDecimais(decimal) {
            const horas = Math.floor(decimal);
            const minutos = Math.round((decimal - horas) * 60);
            return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
                2,
                "0"
            )}`;
        }

        document.querySelector("#horasExtras").textContent =
            formatarHorasDecimais(totalHorasExtras);
        document.querySelector(
            "#limiteHorasExtras"
        ).textContent = `Limite de ${formatarHorasDecimais(limite)}`;
    } catch (error) {
        console.error("Erro:", error.message);
    }
});
