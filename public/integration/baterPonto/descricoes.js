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
async function carregarBreak(usuarioId) {
    try {
        // pega a data atual no formato dd/MM/yyyy
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, "0");
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = hoje.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;

        // chama o endpoint
        const endpoint = `/pontos/${usuarioId}?data=${encodeURIComponent(dataFormatada)}`;
        const registros = await get(endpoint);

        // procura ALMOCO e VOLTA_ALMOCO
        const almoco = registros.find(r => r.tipo === "ALMOCO");
        const voltaAlmoco = registros.find(r => r.tipo === "VOLTA_ALMOCO");

        let textoBreak = "--:--";
        if (almoco && voltaAlmoco) {
            const inicio = new Date(almoco.horario);
            const fim = new Date(voltaAlmoco.horario);

            const diffMs = fim - inicio;
            const diffMin = Math.floor(diffMs / 60000);
            const horas = String(Math.floor(diffMin / 60)).padStart(2, "0");
            const minutos = String(diffMin % 60).padStart(2, "0");

            textoBreak = `${horas}:${minutos}`;
        }

        // coloca no HTML
        const breakEl = document.querySelector(".card-user span");
        if (breakEl) breakEl.textContent = `Seu break foi de ${textoBreak}`;

    } catch (err) {
        console.error("Erro ao carregar break:", err);
    }
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

    carregarBreak(1); // aqui você passa o usuarioId
    carregarUsuario();
}

document.addEventListener("DOMContentLoaded", iniciarDescricoes);
