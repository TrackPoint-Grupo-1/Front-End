import { get, post } from "../connection.js"; // ajuste o caminho relativo se necessário

const TIPOS_PONTO = ["ENTRADA", "ALMOCO", "VOLTA_ALMOCO", "SAIDA"];

// pega o horário atual no formato ISO (yyyy-MM-ddTHH:mm:ss)
function horarioAtualISO() {
  const agora = new Date();
  return agora.toISOString().split(".")[0];
}

// função para bater ponto
async function baterPonto() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuario || !usuario.id) throw new Error("Usuário não encontrado no localStorage");

    // data de hoje
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    // GET para verificar pontos existentes
    let registros = [];
    try {
      registros = await get(`/pontos/${usuario.id}?data=${encodeURIComponent(dataFormatada)}`);
    } catch (err) {
      if (err.message.includes("404")) registros = []; // se não houver ponto, começa do zero
      else throw err;
    }

    // determina o próximo tipo
    const tiposExistentes = registros.map(r => r.tipo);
    const proximoTipo = tiposExistentes.length === 0 ? "ENTRADA" : TIPOS_PONTO.find(tipo => !tiposExistentes.includes(tipo));

    if (!proximoTipo) {
      alert("Todos os pontos do dia já foram batidos!");
      return;
    }

    // POST via connection.js
    await post("/pontos", {
      usuarioId: usuario.id,
      tipo: proximoTipo,
      horario: horarioAtualISO(),
      localidade: "Escritório",
      observacoes: ""
    });

    alert(`Ponto ${proximoTipo} registrado com sucesso!`);
    location.reload(); // recarrega a tela

  } catch (err) {
    console.error(err);
    alert(`Erro: ${err.message}`);
  }
}

// --------------------
// Atrelando o botão
// --------------------
function iniciarBaterPonto() {
  // Event Delegation para garantir que o botão funcione mesmo se carregado depois
  document.addEventListener("click", (e) => {
    if (e.target.matches(".baterponto")) {
      baterPonto();
    }
  });
}

// inicializa
document.addEventListener("DOMContentLoaded", iniciarBaterPonto);
