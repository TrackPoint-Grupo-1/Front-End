import { get, post } from "../connection.js"; // ajuste o caminho relativo se necessário

const TIPOS_PONTO = ["ENTRADA", "ALMOCO", "VOLTA_ALMOCO", "SAIDA"];

// Pega o horário atual no formato ISO (yyyy-MM-ddTHH:mm:ss)
function horarioAtualISO() {
  const agora = new Date();
  const tzOffset = agora.getTimezoneOffset() * 60000; // diferença em ms do UTC
  const localISO = new Date(agora - tzOffset).toISOString().slice(0, 19);
  return localISO;
}

// Função para obter localização atual do usuário
async function obterLocalizacao() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve("Localização não disponível");
    } else {
      navigator.geolocation.getCurrentPosition(
        pos => {
          // arredonda para 4 casas decimais
          const lat = pos.coords.latitude.toFixed(4);
          const lon = pos.coords.longitude.toFixed(4);
          resolve(`Lat: ${lat}, Lon: ${lon}`);
        },
        err => resolve("Localização não disponível") // se usuário negar
      );
    }
  });
}

// Função principal para bater ponto
async function baterPonto() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuario || !usuario.id) throw new Error("Usuário não encontrado no localStorage");

    // data de hoje no formato dd/MM/yyyy
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
      if (err.message.includes("404")) registros = [];
      else throw err;
    }

    // determina o próximo tipo
    const tiposExistentes = registros.map(r => r.tipo);
    const proximoTipo = tiposExistentes.length === 0 ? "ENTRADA" : TIPOS_PONTO.find(tipo => !tiposExistentes.includes(tipo));

    if (!proximoTipo) {
      alert("Todos os pontos do dia já foram batidos!");
      return;
    }

    // obtém localização
    const localidade = await obterLocalizacao();

    // POST via connection.js
    await post("/pontos", {
      usuarioId: usuario.id,
      tipo: proximoTipo,
      horario: horarioAtualISO(),
      localidade: localidade,
      observacoes: "AUTOMATICO"
    });

    alert(`Ponto ${proximoTipo} registrado com sucesso!`);
    location.reload();

  } catch (err) {
    console.error(err);
    alert(`Erro: ${err.message}`);
  }
}

// --------------------
// Event Delegation para o botão
// --------------------
function iniciarBaterPonto() {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".baterponto")) {
      baterPonto();
    }
  });
}

// Inicializa
document.addEventListener("DOMContentLoaded", iniciarBaterPonto);
