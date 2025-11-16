(function loadVLibras() {
  // Evita carregar duas vezes
  if (window.vlibrasLoaded) return;
  window.vlibrasLoaded = true;

  // Cria o container do VLibras
  const div = document.createElement("div");
  div.setAttribute("vw", "class");
  div.classList.add("enabled");
  div.innerHTML = `
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  `;
  document.body.appendChild(div);

  // Carrega o script do VLibras
  const script = document.createElement("script");
  script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
  script.onload = () => {
    new window.VLibras.Widget("https://vlibras.gov.br/app");
  };
  
  document.body.appendChild(script);
})();
