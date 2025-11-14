import { get } from "../connection.js";

const usuarioLogado = localStorage.getItem("usuarioLogado")

async function carregarHorasMensais(gerenteId) {
  const { inicio, fim } = getInicioEFimDoMesAtual();

  const endpoint = `/apontamento-horas/gerente/${gerenteId}?dataInicio=${encodeURIComponent(
    inicio
  )}&dataFim=${encodeURIComponent(fim)}`;

  // Log sempre visível para facilitar debug
  console.log("[HorasMensais] Endpoint relativo:", endpoint);

  try {
    const apontamentos = await get(endpoint);

    // Garantir array
    const lista = Array.isArray(apontamentos) ? apontamentos : [];

    // Função para normalizar horasFeita (aceita number ou "HH:MM:SS")
    function normalizarHoras(h) {
      if (h == null) return 0;
      if (typeof h === "number") return h; // já em horas decimais
      if (typeof h === "string") {
        // formatos possíveis: "10:00:00" ou "10" ou "10.5"
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(h)) {
          const [hor, min, seg] = h.split(":" ).map(n => parseInt(n,10));
          return hor + min/60 + seg/3600;
        }
        const f = parseFloat(h);
        return isNaN(f) ? 0 : f;
      }
      return 0;
    }

    // Deduplicar registros potencialmente repetidos (por id se existir; senão chave composta)
    const mapa = new Map();
    for (const item of lista) {
      const chaveId = item.id || item.apontamentoId;
      const chaveGenerica = chaveId || [item.data || item.dia, item.projetoId, item.acao, item.horasFeita].join("|#|");
      if (!mapa.has(chaveGenerica)) {
        mapa.set(chaveGenerica, item);
      }
    }
    const unicos = Array.from(mapa.values());

    // Estratégia de agrupamento por dia para evitar somar duplicações de mesma jornada:
    // Se vários registros do MESMO dia têm exatamente o MESMO valor de horasFeita normalizado,
    // assumimos que são "vistas" diferentes (por acao) da mesma carga de trabalho e contamos apenas uma vez.
    // Caso os valores sejam diferentes, somamos (pois provavelmente são fatias distintas do dia).

    function extrairDia(obj) {
      return obj.data || obj.dia || obj.dataApontamento || obj.dataRegistro || "SEM_DIA";
    }

    const gruposPorDia = new Map();
    for (const item of unicos) {
      const dia = extrairDia(item);
      const horasNorm = normalizarHoras(item.horasFeita);
      if (!gruposPorDia.has(dia)) {
        gruposPorDia.set(dia, { valores: [], raw: [] });
      }
      const g = gruposPorDia.get(dia);
      g.valores.push(horasNorm);
      g.raw.push(item);
    }

    let totalHoras = 0;
    const resumoDias = [];
    for (const [dia, dados] of gruposPorDia.entries()) {
      const setValores = new Set(dados.valores);
      const horasDia = setValores.size === 1 ? [...setValores][0] : dados.valores.reduce((a,b)=>a+b,0);
      totalHoras += horasDia;
      resumoDias.push({ dia, registros: dados.raw.length, valores: dados.valores, horasDiaCalculada: horasDia });
    }

    // Logs de debug sempre (remover quando estabilizar)
    console.group("Debug Horas Mensais");
    console.log("Registros recebidos (raw):", lista.length, lista);
    console.log("Registros únicos (por chave):", unicos.length, unicos);
    console.table(unicos.map(u => ({ id: u.id || u.apontamentoId, acao: u.acao, horasFeita: u.horasFeita, dia: extrairDia(u) })));
    console.log("Resumo por dia (agrupamento):");
    console.table(resumoDias);
    console.log("Total horas após agrupamento:", totalHoras);
    console.groupEnd();

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
  const horasInt = Math.floor(totalHoras);
  const minutosTotal = Math.round((totalHoras - horasInt) * 60);
  const horasFormat = String(horasInt).padStart(2, "0");
  const minutosFormat = String(minutosTotal).padStart(2, "0");
  const formatado = `${horasFormat}:${minutosFormat}:00`;

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
  )}&dataFim=${encodeURIComponent(fim)}`;

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
  )}&dataFim=${encodeURIComponent(fim)}`;

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
