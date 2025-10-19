import { get, patch } from "../connection.js";

/**
 * Carrega solicitações de horas extras pendentes para o gerente e popula a tabela.
 */
async function carregarSolicitacoesHorasExtras(gerenteId) {
  const endpointSolicitacoes = `/horas-extras/solicitacoes-pendentes/gerente/${gerenteId}`;

  // localizar o card específico de "Solicitações de Horas Extras"
  const targetCard = Array.from(document.querySelectorAll(".card")).find((c) =>
    c.querySelector(".card-title")?.textContent?.trim().startsWith("Solicitações de Horas Extras")
  );
  if (!targetCard) return;

  // obter também o container da tabela e o empty-state
  const tableContainer = targetCard.querySelector(".table-container");
  const tableBody = targetCard.querySelector(".table-container .table tbody");
  const searchInput = targetCard.querySelector(".search-container input[type='text']");
  const emptyState = targetCard.querySelector("#empty-solicitacoes-horas-extras");

  if (!tableBody) return;

  // limpa linhas de exemplo
  tableBody.innerHTML = "";
  if (tableContainer) tableContainer.style.display = ""; // garantir visibilidade inicial

  try {
    const solicitacoes = await get(endpointSolicitacoes);

    // padrão esperado no servidor quando não há solicitações
    const serverMsgPattern = "Nenhuma solicitação de horas extras pendente encontrada para o gerente com id";

    // helper para detectar a mensagem de "nenhuma solicitação" em string ou em objeto { mensagem: "..." }
    function isServerEmptyMessage(val) {
      if (typeof val === "string") return val.includes(serverMsgPattern);
      if (val && typeof val === "object" && typeof val.mensagem === "string") return val.mensagem.includes(serverMsgPattern);
      return false;
    }

    // caso o servidor retorne a mensagem de empty-state (string ou objeto), mostrar o empty-state do HTML
    if (isServerEmptyMessage(solicitacoes)) {
      tableBody.innerHTML = "";
      if (tableContainer) tableContainer.style.display = "none";
      if (emptyState) emptyState.style.display = "block"; // usa a mensagem já definida em visao-geral.html
      return;
    }

    if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
      // mostrar empty-state (não inserir linha na tabela)
      tableBody.innerHTML = "";
      if (tableContainer) tableContainer.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    // carregar dados do usuário para cada solicitação em paralelo
    const promises = solicitacoes.map(async (s) => {
      const usuario = s.usuarioId ? await get(`/usuarios/${s.usuarioId}`) : null;
      return { solicitacao: s, usuario };
    });

    const items = await Promise.all(promises);

    function montarLinha(item) {
      const s = item.solicitacao;
      const u = item.usuario || {};
      const nome = u.nome || "—";
      const email = u.email || "—";
      const data = s.data || "—";
      const de = s.horasDe || "—";
      const ate = s.horasAte || "—";
      const justificativa = s.justificativa || "—";
      const observacao = s.observacao || "—";

      return `
        <tr data-nome="${nome.toLowerCase()}" data-id="${s.id}">
          <td>
            <div>
              <div style="font-weight: 500;">${escapeHtml(nome)}</div>
              <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(email)}</div>
            </div>
          </td>
          <td>${escapeHtml(data)}</td>
          <td>${escapeHtml(de)} - ${escapeHtml(ate)}</td>
          <td>${escapeHtml(justificativa)}</td>
          <td>${escapeHtml(observacao)}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-success btn-sm btn-aprovar" data-id="${s.id}" data-usuario="${s.usuarioId}">APROVAR</button>
              <button class="btn btn-secondary btn-sm btn-retornar" data-id="${s.id}" data-usuario="${s.usuarioId}">RETORNAR</button>
            </div>
          </td>
        </tr>
      `;
    }

    // popular tabela
    tableBody.innerHTML = items.map(montarLinha).join("");
    // garantir que a tabela é mostrada e o empty-state escondido
    if (tableContainer) tableContainer.style.display = "";
    if (emptyState) emptyState.style.display = "none";

    // helper para enviar PATCH (usa patch do connection.js)
    // agora o backend espera um enum no campo `foiAprovada` com valores:
    // "PENDENTE", "APROVADO", "REJEITADO"
    async function enviarPatchAprovacao(id, statusEnum) {
      // statusEnum deve ser uma string válida: "APROVADO" | "REJEITADO" | "PENDENTE"
      if (typeof statusEnum !== "string") {
        throw new Error("statusEnum inválido ao enviar PATCH");
      }
      try {
        // patch espera (path, body) e já aplica base/headers no connection.js
        return await patch(`/horas-extras/${encodeURIComponent(id)}`, { foiAprovada: statusEnum });
      } catch (err) {
        throw err;
      }
    }

    // attach handlers (usar referência 'btn' para evitar e.currentTarget após await)
    tableBody.querySelectorAll(".btn-aprovar").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.dataset.id;
        const usuarioId = btn.dataset.usuario;
        const row = btn.closest("tr");
        try {
          btn.disabled = true;
          // executar PATCH com enum "APROVADO"
          await enviarPatchAprovacao(id, "APROVADO");
          // remover linha da tabela ao aprovar com sucesso
          if (row) row.remove();
          // se não houver mais linhas, mostrar empty-state
          if (tableBody.querySelectorAll("tr").length === 0) {
            tableBody.innerHTML = "";
            if (tableContainer) tableContainer.style.display = "none";
            if (emptyState) emptyState.style.display = "block";
          }
          console.log("Aprovar solicitação:", id, "usuario:", usuarioId);
        } catch (err) {
          console.error("Erro ao aprovar solicitação:", err);
          if (row) {
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.style.color = "#ef4444";
            cell.textContent = "Erro ao aprovar solicitação. Tente novamente.";
            row.after(cell);
            setTimeout(() => cell.remove(), 4000);
          }
          btn.disabled = false;
        }
      });
    });

    tableBody.querySelectorAll(".btn-retornar").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.dataset.id;
        const usuarioId = btn.dataset.usuario;
        const row = btn.closest("tr");
        try {
          btn.disabled = true;
          // executar PATCH com enum "REJEITADO"
          await enviarPatchAprovacao(id, "REJEITADO");
          // remover linha da tabela ao retornar com sucesso
          if (row) row.remove();
          // se não houver mais linhas, mostrar empty-state
          if (tableBody.querySelectorAll("tr").length === 0) {
            tableBody.innerHTML = "";
            if (tableContainer) tableContainer.style.display = "none";
            if (emptyState) emptyState.style.display = "block";
          }
          console.log("Retornar solicitação:", id, "usuario:", usuarioId);
        } catch (err) {
          console.error("Erro ao retornar solicitação:", err);
          if (row) {
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.style.color = "#ef4444";
            cell.textContent = "Erro ao retornar solicitação. Tente novamente.";
            row.after(cell);
            setTimeout(() => cell.remove(), 4000);
          }
          btn.disabled = false;
        }
      });
    });

    // search filter
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        Array.from(tableBody.querySelectorAll("tr")).forEach((tr) => {
          const nome = tr.dataset.nome || "";
          tr.style.display = nome.includes(q) ? "" : "none";
        });
      });
    }
  } catch (err) {
    // se o backend respondeu 404 com { mensagem: "Nenhuma solicitação..." } ou error contém a mensagem, mostrar empty-state
    try {
      const errMsg = err && (err.mensagem || (err.response && err.response.mensagem) || err.message);
      if (err && (err.status === 404 || err.statusCode === 404 || (typeof errMsg === "string" && errMsg.includes("Nenhuma solicitação de horas extras pendente")))) {
        tableBody.innerHTML = "";
        if (tableContainer) tableContainer.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        return;
      }
    } catch (__) { /* ignore */ }

    console.error("Erro ao carregar solicitações de horas extras:", err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Erro ao carregar solicitações</td></tr>`;
  }
}

// utilitário mínimo para escapar html em strings interpoladas
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// inicializar quando o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (usuarioLogado && usuarioLogado.id) {
    carregarSolicitacoesHorasExtras(usuarioLogado.id);
  }
});