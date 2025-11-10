import { get } from "../connection.js";

console.log("DESCRICOES.JS")

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
        // Helper para formatar em minutos e segundos (MMm SSs)
        function formatarMinSeg(ms) {
            const totalSeg = Math.floor(ms / 1000);
            const minutos = String(Math.floor(totalSeg / 60)).padStart(2, "0");
            const segundos = String(totalSeg % 60).padStart(2, "0");
            return `${minutos}m ${segundos}s`;
        }

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
        } else if (almoco && !volta) {
            // Almoço em andamento: cálculo minuto/segundo claro
            const inicio = parseComoLocal(almoco.horario) || new Date(almoco.horario);
            const agora = new Date();
            const diffMs = agora - inicio;
            if (diffMs > 0 && diffMs < 8 * 60 * 60000) { // limita a 8h para evitar valores absurdos
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
