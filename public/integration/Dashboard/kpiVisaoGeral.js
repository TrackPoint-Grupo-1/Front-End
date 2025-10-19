import { get } from "../connection.js";

const usuarioLogado = localStorage.getItem("usuarioLogado")

async function carregarHorasMensais(gerenteId) {
  const { inicio, fim } = getInicioEFimDoMesAtual();

  const endpoint = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(
    inicio
  )}&datafim=${encodeURIComponent(fim)}`;

  try {
    const apontamentos = await get(endpoint);
    const totalHoras = apontamentos.reduce(
      (acc, item) => acc + (item.horasFeita || 0),
      0
    );

    // Salvar horas anteriores
    const ultimaHora = parseFloat(localStorage.getItem("ultimaHoraMensal")) || 0;
    const percentual = ultimaHora
      ? (((totalHoras - ultimaHora) / ultimaHora) * 100).toFixed(1)
      : 0;

    // Atualizar localStorage
    localStorage.setItem("ultimaHoraMensal", totalHoras);

    atualizarMetricas(totalHoras, percentual);
  } catch (error) {
    console.error("Erro ao carregar horas mensais:", error);
  }
}

function atualizarMetricas(totalHoras, percentual) {
  const metricValue = document.querySelector(".metric-value");
  const metricChange = document.querySelector(".metric-change span");
  const arrow = document.querySelector(".metric-change i");

  // Converter total para formato HH:MM:SS
  const horas = Math.floor(totalHoras);
  const minutos = Math.round((totalHoras - horas) * 60);
  const formatado = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:00`;

  metricValue.textContent = formatado;

  if (percentual >= 0) {
    metricChange.textContent = `+${percentual}%`;
    metricChange.parentElement.classList.add("positive");
    metricChange.parentElement.classList.remove("negative");
    arrow.className = "fas fa-arrow-up";
  } else {
    metricChange.textContent = `${percentual}%`;
    metricChange.parentElement.classList.add("negative");
    metricChange.parentElement.classList.remove("positive");
    arrow.className = "fas fa-arrow-down";
  }
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
    inicio: formatar(inicio), // Ex: "01/10/2025"
    fim: formatar(fim), // Ex: "31/10/2025"
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (usuarioLogado && usuarioLogado.id) {
    carregarHorasMensais(usuarioLogado.id);
    carregarHorasExtras(usuarioLogado.id);
    carregarPercentualTreinamento(usuarioLogado.id); // <--- chamada adicionada
  }
});

async function carregarHorasExtras(gerenteId) {
  const { inicio, fim } = getInicioEFimDoMesAtual();

  // endpoint que retorna {"horaExtra":"01:00:00"}
  const endpointExtras = `/horas-extras/total-horas-extras/projetos-gerente/${gerenteId}?dataInicio=${encodeURIComponent(
    inicio
  )}&dataFim=${encodeURIComponent(fim)}`;

  // endpoint para buscar apontamentos mensais (mesmo usado em carregarHorasMensais)
  const endpointApontamentos = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(
    inicio
  )}&datafim=${encodeURIComponent(fim)}`;

  try {
    const respostaExtras = await get(endpointExtras);
    const horaExtraStr = (respostaExtras && respostaExtras.horaExtra) || "00:00:00";

    // converter "HH:MM:SS" para horas decimais
    function parseTimeToHours(timeStr) {
      const parts = timeStr.split(":").map((p) => parseInt(p, 10) || 0);
      const [h, m, s] = parts;
      return h + m / 60 + s / 3600;
    }

    const horasExtras = parseTimeToHours(horaExtraStr);

    // buscar total de horas mensais
    const apontamentos = await get(endpointApontamentos);
    const totalHoras = (Array.isArray(apontamentos)
      ? apontamentos.reduce((acc, item) => acc + (item.horasFeita || 0), 0)
      : 0);

    // calcular percentual de horas extras sobre jornada mensal
    const totalPercentual = totalHoras > 0 ? (horasExtras / totalHoras) * 100 : 0;

    // salvar percentual anterior e calcular mudança
    const ultimaPercentual = parseFloat(localStorage.getItem("ultimaHoraExtraPercentual")) || 0;
    const percentualMudanca = ultimaPercentual
      ? (((totalPercentual - ultimaPercentual) / Math.abs(ultimaPercentual)) * 100).toFixed(1)
      : 0;

    localStorage.setItem("ultimaHoraExtraPercentual", totalPercentual);

    atualizarMetricasExtras(totalPercentual, parseFloat(percentualMudanca));
  } catch (error) {
    console.error("Erro ao carregar horas extras:", error);
  }
}


function atualizarMetricasExtras(totalPercentual, percentualMudanca) {
  const metricCard = document.querySelectorAll(".metric-card")[1];
  const metricValue = metricCard.querySelector(".metric-value");
  const metricChangeSpan = metricCard.querySelector(".metric-change span");
  const changeContainer = metricCard.querySelector(".metric-change");
  const arrow = metricCard.querySelector(".metric-change i");

  metricValue.textContent = `${Number(totalPercentual || 0).toFixed(2)}%`;

  // garantir numero
  const mudanca = Number(percentualMudanca) || 0;

  if (mudanca >= 0) {
    metricChangeSpan.textContent = `+${mudanca.toFixed(1)}%`;
    changeContainer.classList.add("positive");
    changeContainer.classList.remove("negative");
    arrow.className = "fas fa-arrow-up";
  } else {
    metricChangeSpan.textContent = `${mudanca.toFixed(1)}%`;
    changeContainer.classList.add("negative");
    changeContainer.classList.remove("positive");
    arrow.className = "fas fa-arrow-down";
  }
}

// Nova função: calcula percentual de horas alocadas em Treinamento e atualiza o card
async function carregarPercentualTreinamento(gerenteId) {
  const { inicio, fim } = getInicioEFimDoMesAtual();
  const endpointApontamentos = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(
    inicio
  )}&datafim=${encodeURIComponent(fim)}`;

  try {
    const apontamentos = await get(endpointApontamentos);
    if (!Array.isArray(apontamentos)) return;

    // somar horas totais e horas de treinamento (acao === "Treinamento", case-insensitive)
    const totals = apontamentos.reduce(
      (acc, item) => {
        const h = Number(item.horasFeita) || 0;
        acc.totalHoras += h;
        const acao = (item.acao || "").toString().trim().toLowerCase();
        if (acao === "treinamento") acc.horasTreinamento += h;
        return acc;
      },
      { totalHoras: 0, horasTreinamento: 0 }
    );

    const { totalHoras, horasTreinamento } = totals;
    const percentual = totalHoras > 0 ? (horasTreinamento / totalHoras) * 100 : 0;

    // salvar e calcular variação em relação ao anterior
    const key = "ultimaPercentualTreinamento";
    const ultima = parseFloat(localStorage.getItem(key)) || 0;
    const percentualMudanca = ultima
      ? (((percentual - ultima) / Math.abs(ultima)) * 100).toFixed(1)
      : 0;
    localStorage.setItem(key, percentual);

    atualizarMetricasTreinamento(percentual, parseFloat(percentualMudanca));
  } catch (err) {
    console.error("Erro ao carregar percentual de treinamento:", err);
  }
}

function atualizarMetricasTreinamento(percentual, percentualMudanca) {
  // procurar o card cujo título contenha "Treinamento"
  const metricCard = Array.from(document.querySelectorAll(".metric-card")).find((c) => {
    const titleEl = c.querySelector(".metric-title");
    return titleEl && titleEl.textContent.includes("Treinamento");
  });

  if (!metricCard) return;

  const metricValue = metricCard.querySelector(".metric-value");
  const changeContainer = metricCard.querySelector(".metric-change");
  const changeSpan = changeContainer ? changeContainer.querySelector("span") : null;
  const arrow = changeContainer ? changeContainer.querySelector("i") : null;

  metricValue.textContent = `${Number(percentual || 0).toFixed(2)}%`;

  const mudanca = Number(percentualMudanca) || 0;
  if (!changeSpan || !changeContainer || !arrow) return;

  if (mudanca >= 0) {
    changeSpan.textContent = `+${mudanca.toFixed(1)}%`;
    changeContainer.classList.add("positive");
    changeContainer.classList.remove("negative");
    arrow.className = "fas fa-arrow-up";
  } else {
    changeSpan.textContent = `${mudanca.toFixed(1)}%`;
    changeContainer.classList.add("negative");
    changeContainer.classList.remove("positive");
    arrow.className = "fas fa-arrow-down";
  }
}
