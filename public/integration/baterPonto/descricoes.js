import { get } from "../connection.js";

console.log("DESCRICOES.JS")

// --------------------
// Estado e timers (break em andamento)
// --------------------
let breakTimerId = null;        // atualiza o relógio em tela a cada segundo
let breakStatusSyncId = null;   // revalida com o backend periodicamente
let breakInicio = null;         // Date do início do almoço em andamento
let usuarioIdCache = null;      // cache do id do usuário logado

// --------------------
// Função para formatar a data em português
// --------------------
function formatarDataAtual() {
  const hoje = new Date();
  const opcoes = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  let data = hoje.toLocaleDateString("pt-BR", opcoes);

  // transforma cada palavra corretamente
  data = data
    .split(" ")
    .map(palavra => {
      // mantém "de" sempre minúsculo
      if (palavra.toLowerCase() === "de") return "de";
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    })
    .join(" ");

  return data;
}

// --------------------
// Função para formatar a hora (HH:mm)
// --------------------
function formatarHora(date) {
    return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// --------------------
// Atualizar data e hora em tela
// --------------------
function atualizarDataHora() {
    const dataEl = document.querySelector(".hours .data");
    const horaEl = document.querySelector(".hours h1");

    if (dataEl) dataEl.textContent = formatarDataAtual();
    if (horaEl) horaEl.textContent = formatarHora(new Date());
}

// --------------------
// Formatação utilitária
// --------------------
// Minutos e segundos: "MMm SSs"
function formatarMinSeg(ms) {
    const totalSeg = Math.floor(ms / 1000);
    const minutos = String(Math.floor(totalSeg / 60)).padStart(2, "0");
    const segundos = String(totalSeg % 60).padStart(2, "0");
    return `${minutos}m ${segundos}s`;
}

// --------------------
// Controle do timer dinâmico do break em andamento
// --------------------
function tickBreakTimer() {
    if (!breakInicio) return;
    const diffMs = Date.now() - breakInicio.getTime();
    if (diffMs < 0) return;
    let texto;
    if (diffMs >= 8 * 60 * 60 * 1000) {
        texto = "+8h (em andamento)";
    } else {
        texto = `${formatarMinSeg(diffMs)} (em andamento)`;
    }
    atualizarBreakTexto(texto);
}

function iniciarBreakTimer(inicio) {
    // Evita recriar se já estamos contando do mesmo início
    if (breakInicio && inicio instanceof Date && breakInicio.getTime() === inicio.getTime()) {
        return;
    }
    pararBreakTimer();
    breakInicio = inicio instanceof Date ? inicio : null;
    if (!breakInicio) return;

    // Atualiza imediatamente e depois a cada segundo
    tickBreakTimer();
    breakTimerId = setInterval(tickBreakTimer, 1000);

    // De tempos em tempos, revalida com o backend se o break já foi encerrado
    // Mantemos leve: a cada 20 segundos durante o andamento
    breakStatusSyncId = setInterval(() => {
        if (usuarioIdCache) carregarBreak(usuarioIdCache);
    }, 20000);
}

function pararBreakTimer() {
    if (breakTimerId) clearInterval(breakTimerId);
    if (breakStatusSyncId) clearInterval(breakStatusSyncId);
    breakTimerId = null;
    breakStatusSyncId = null;
    breakInicio = null;
}

// --------------------
// Buscar dados do backend e calcular break
// --------------------
// --------------------
// Buscar dados do backend e calcular break (intervalo de almoço)
// --------------------
async function carregarBreak(usuarioIdParam) {
    try {
        // Descobre id do usuário logado se não veio por parâmetro
        let usuarioId = usuarioIdParam;
        if (!usuarioId) {
            try {
                const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
                usuarioId = usuarioLogado?.id;
            } catch (_) { /* ignora */ }
        }
        // guarda em cache para o timer de sincronização
        usuarioIdCache = usuarioId || usuarioIdCache;
        if (!usuarioId) {
            console.warn("Não foi possível determinar o ID do usuário para calcular o break.");
            atualizarBreakTexto("--:--");
            return;
        }

        // Data atual dd/MM/yyyy
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, "0");
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = hoje.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;

        const endpoint = `/pontos/${usuarioId}?data=${encodeURIComponent(dataFormatada)}`;
        console.log("[Break] Chamando endpoint:", endpoint);
        let registros = await get(endpoint);

        // Garante que registros é array
        if (!Array.isArray(registros)) {
            // tenta extrair de propriedades comuns
            if (Array.isArray(registros?.content)) registros = registros.content;
            else if (Array.isArray(registros?.registros)) registros = registros.registros;
            else registros = [];
        }
        console.log("[Break] Registros retornados:", registros);

        if (!registros.length) {
            atualizarBreakTexto("--:--");
            return;
        }

        // --------------------
        // Utilitários de data/horário
        // --------------------
        const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

        // Heurística: alguns backends salvam hora local mas enviam com "Z" (UTC) por engano.
        // Para evitar deslocamento de -3h no BR, se terminar com 'Z', vamos interpretar como hora local.
        function parseComoLocal(horario) {
            if (!horario) return null;
            if (typeof horario === "number") return new Date(horario);
            if (typeof horario !== "string") return null;

            // dd/MM/yyyy HH:mm (fallback)
            if (horario.includes("/")) {
                // tenta formatos comuns: dd/MM/yyyy HH:mm[:ss]
                const [data, tempo = "00:00:00"] = horario.split(" ");
                const [dd, MM, yyyy] = data.split("/").map(Number);
                const [HH = 0, mm = 0, ss = 0] = tempo.split(":").map(Number);
                const d = new Date(yyyy, (MM || 1) - 1, dd || 1, HH, mm, ss);
                return isValidDate(d) ? d : null;
            }

            // ISO
            if (horario.endsWith("Z")) {
                // remove Z e cria como local
                const semZ = horario.slice(0, -1);
                const m = semZ.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
                if (m) {
                    const [_, y, mo, d, h, mi, s = "0", ms = "0"] = m;
                    const dt = new Date(
                        Number(y),
                        Number(mo) - 1,
                        Number(d),
                        Number(h),
                        Number(mi),
                        Number(s),
                        Number(ms)
                    );
                    return isValidDate(dt) ? dt : null;
                }
            }

            // Caso geral: deixa o motor do JS parsear
            const parsed = new Date(horario);
            return isValidDate(parsed) ? parsed : null;
        }

        function ordenarPorHorarioAsc(a, b) {
            const da = parseComoLocal(a.horario) || new Date(a.horario);
            const db = parseComoLocal(b.horario) || new Date(b.horario);
            return da - db;
        }

        function filtrarPorTipo(tipo) {
            const up = (tipo || "").toUpperCase();
            return registros.filter(r => (r.tipo || "").toUpperCase() === up);
        }

        // Seleciona o par mais recente válido (ALMOCO <= VOLTA_ALMOCO)
        function obterParAlmoco() {
            const almoços = filtrarPorTipo("ALMOCO").sort(ordenarPorHorarioAsc);
            const voltas = filtrarPorTipo("VOLTA_ALMOCO").sort(ordenarPorHorarioAsc);
            if (!almoços.length && !voltas.length) return { almoco: null, volta: null };

            let par = { almoco: null, volta: null };
            for (let i = almoços.length - 1; i >= 0; i--) {
                const a = almoços[i];
                const da = parseComoLocal(a.horario);
                if (!isValidDate(da)) continue;
                // busca a última volta que seja depois do almoço
                for (let j = voltas.length - 1; j >= 0; j--) {
                    const v = voltas[j];
                    const dv = parseComoLocal(v.horario);
                    if (!isValidDate(dv)) continue;
                    if (dv >= da) {
                        par = { almoco: a, volta: v };
                        return par;
                    }
                }
                // se não achou volta depois, mantém almoço mais recente para possível "em andamento"
                if (!par.almoco) par.almoco = a;
            }
            return par;
        }

        const { almoco, volta } = obterParAlmoco();

        let textoBreak = "--:--";

        if (almoco && volta) {
            const inicio = parseComoLocal(almoco.horario) || new Date(almoco.horario);
            const fim = parseComoLocal(volta.horario) || new Date(volta.horario);
            const diffMs = fim - inicio;
            if (diffMs > 0) {
                // Para intervalo concluído, manter horas:minutos se >= 60min, senão mostrar min/sec.
                const diffMin = Math.floor(diffMs / 60000);
                if (diffMin >= 60) {
                    const horas = String(Math.floor(diffMin / 60)).padStart(2, "0");
                    const minutos = String(diffMin % 60).padStart(2, "0");
                    textoBreak = `${horas}h ${minutos}m`;
                } else {
                    textoBreak = formatarMinSeg(diffMs);
                }
            } else {
                textoBreak = "00m 00s"; // horários fora de ordem
            }
            // Encerrado: para o timer de andamento, se houver
            pararBreakTimer();
        } else if (almoco && !volta) {
            // Almoço em andamento: cálculo minuto/segundo claro
            const inicio = parseComoLocal(almoco.horario) || new Date(almoco.horario);
            // Inicia/continua o timer dinâmico em tela
            iniciarBreakTimer(inicio);
            // A mensagem em si será atualizada pelo tick a cada segundo
            const diffMs = Date.now() - inicio.getTime();
            if (diffMs > 0 && diffMs < 8 * 60 * 60000) {
                textoBreak = `${formatarMinSeg(diffMs)} (em andamento)`;
            } else if (diffMs >= 8 * 60 * 60000) {
                textoBreak = "+8h (em andamento)";
            } else {
                textoBreak = "Em andamento";
            }
        }

        atualizarBreakTexto(textoBreak);
    } catch (err) {
        console.error("Erro ao carregar break:", err);
        atualizarBreakTexto("--:--");
    }
}

function atualizarBreakTexto(texto) {
    const breakEl = document.querySelector(".card-user span");
    if (breakEl) breakEl.textContent = `Seu break foi de ${texto}`;
}

function carregarUsuario() {
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (usuarioLogado && usuarioLogado.nome) {
            const nomeEl = document.querySelector(".card-user h2");
            if (nomeEl) {
                nomeEl.textContent = usuarioLogado.nome.toUpperCase();
            }
        } else {
            console.warn("Nenhum usuário logado encontrado no localStorage.");
        }
    } catch (err) {
        console.error("Erro ao carregar usuário:", err);
    }
}

// --------------------
// Inicialização
// --------------------
function iniciarDescricoes() {
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000); // atualiza hora em tempo real

    // Usa ID real do usuário logado
    let usuarioId;
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        usuarioId = usuarioLogado?.id;
    } catch (_) { /* ignore */ }
    carregarBreak(usuarioId);
    carregarUsuario();
}

document.addEventListener("DOMContentLoaded", iniciarDescricoes);

// Limpa timers ao sair da página
window.addEventListener("beforeunload", () => {
    pararBreakTimer();
});
