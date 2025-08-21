class MyNavbar extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    // Estrutura da Navbar
    this.navbar = document.createElement('nav');
    this.navbar.classList.add('navbar');

    // Slot para conteúdo da esquerda
    const leftSlot = document.createElement('slot');
    leftSlot.name = 'left';
    this.navbar.appendChild(leftSlot);

    // Botão do lado direito
    this.menuButton = document.createElement('button');
    this.menuButton.classList.add('menu-button');
    this.menuButton.textContent = '☰';
    this.navbar.appendChild(this.menuButton);

    // Overlay (fundo escuro)
    this.overlay = document.createElement('div');
    this.overlay.classList.add('overlay');

    // Sidebar
    this.sidebar = document.createElement('div');
    this.sidebar.classList.add('sidebar');

    // Botão de fechar dentro da sidebar
    this.closeButton = document.createElement('button');
    this.closeButton.classList.add('close-button');
    this.closeButton.textContent = '×';
    this.sidebar.appendChild(this.closeButton);

    // Slot para conteúdo da sidebar
    const sidebarSlot = document.createElement('slot');
    sidebarSlot.name = 'sidebar';
    this.sidebar.appendChild(sidebarSlot);

    // Estilos
    const style = document.createElement('style');
    style.textContent = `
      /* Navbar */
      .navbar {
        width: 100%;
        height: 60px;
        background-color: #008781;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        box-sizing: border-box;
        color: white;
        font-family: "Poppins", sans-serif;
        position: relative;
        z-index: 1000;
      }

      .menu-button {
        background: none;
        border: none;
        font-size: 24px;
        color: white;
        cursor: pointer;
      }

      /* Overlay */
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0,0,0,0.5);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s;
        z-index: 999;
      }

      .overlay.active {
        opacity: 1;
        visibility: visible;
      }

      /* Sidebar */
      .sidebar {
        position: fixed;
        top: 0;
        right: -50%;
        width: 50%;
        height: 100vh;
        background-color: white;
        box-shadow: -4px 0 8px rgba(0,0,0,0.2);
        transition: right 0.3s;
        z-index: 1000;
        padding: 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        border-top-left-radius: 25px;
        border-bottom-left-radius: 25px;
      }

      .siderbar-container{
        width: 100%;
        height: 100%;
        background-color: red;
      }

      .sidebar.active {
        right: 0;
      }

      /* Botão de fechar */
      .close-button {
        background: none;
        border: none;
        font-size: 28px;
        align-self: flex-end;
        cursor: pointer;
        margin-bottom: 10px;
      }

      /* Responsividade */
      @media (max-width: 768px) {
        .sidebar {
          width: 100%;
          right: -100%;
        }
        .sidebar.active {
          right: 0;
        }
      }
    `;

    shadow.appendChild(style);
    shadow.appendChild(this.navbar);
    shadow.appendChild(this.overlay);
    shadow.appendChild(this.sidebar);

    // Eventos
    this.menuButton.addEventListener('click', () => this.toggleSidebar());
    this.overlay.addEventListener('click', () => this.closeSidebar());
    this.closeButton.addEventListener('click', () => this.closeSidebar());
  }

  toggleSidebar() {
    this.sidebar.classList.toggle('active');
    this.overlay.classList.toggle('active');
  }

  closeSidebar() {
    this.sidebar.classList.remove('active');
    this.overlay.classList.remove('active');
  }
}

customElements.define('my-navbar', MyNavbar);
