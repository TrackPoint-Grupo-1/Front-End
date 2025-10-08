import { get } from "/integration/connection.js";

document.addEventListener("DOMContentLoaded", async () => {
  const projetosContainer = document.querySelector(".projetos-ativos");

  if (!projetosContainer) return;

  try {
    // ⚡ Recupera o id do usuário logado (exemplo: salvo no localStorage)
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    const userId = usuario?.id;

    if (!userId) {
      projetosContainer.innerHTML = "<p>Usuário não identificado.</p>";
      console.log("ID DO USUARIO NAO ENCONTRATO")
      return;
    }

    // 🔥 Chamada ao back-end
    const projetos = await get(`/projetos/funcionario/${userId}?status=ANDAMENTO`);
    console.log("CHAMANDO O BACKEND")

    // Limpa a lista antes de renderizar
    projetosContainer.innerHTML = "";

    if (projetos.length === 0) {
      projetosContainer.innerHTML = "<p>Nenhum projeto ativo encontrado.</p>";
      return;
    }

    // Renderiza cada projeto
    projetos.forEach(projeto => {
        console.log("RENDERIZANDO CADA PROJETO")
      const row = document.createElement("div");
      row.classList.add("row-projeto");

      row.innerHTML = `
        <span>${projeto.nome}</span>
        <span>Cód ${String(projeto.id).padStart(6, "0")}</span>
      `;

      projetosContainer.appendChild(row);
    });
  } catch (error) {
    // 🧠 Trata erro 404 especificamente
    if (error.status === 404 || error.message?.includes("404")) {
      projetosContainer.innerHTML = "<p>Nenhum projeto encontrado.</p>";
      console.warn("Nenhum projeto encontrado (404)");
      return;
    }

    console.error("Erro ao carregar projetos:", error);
    projetosContainer.innerHTML = "<p>Erro ao carregar projetos.</p>";
    console.log("ERRO ERRO ERRO");
  }
});
