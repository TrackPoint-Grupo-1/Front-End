class MyNavbar extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: "Poppins", sans-serif;
        }

        nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          background-color: #008781;
          color: white;
        }

        #sidebar-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

        aside#sidebar {
          position: fixed;
          top: 0;
          right: -100%;
          width: 40%;
          height: 93.5%;
          background: white;
          box-shadow: -2px 0 8px rgba(0,0,0,0.3);
          transition: right 0.3s ease;
          overflow-y: auto;
          z-index: 1001;
          padding: 20px;
          border-top-left-radius: 20px;
          border-bottom-left-radius: 20px;
        }

        aside#sidebar.open {
          right: 0;
        }

        #overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 1000;
        }

        #overlay.active {
          opacity: 1;
          pointer-events: all;
        }

        .sidebar-content {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        @media(max-width: 768px) {
          aside#sidebar {
            width: 80%;
          }
        }
      </style>

      <nav>
        <slot name="left"></slot>
        <button id="sidebar-btn">☰</button>
      </nav>

      <aside id="sidebar">
        <div class="sidebar-content">
          <slot name="sidebar"></slot>
        </div>
      </aside>

      <div id="overlay"></div>
    `;

    this.sidebar = shadow.querySelector('#sidebar');
    this.overlay = shadow.querySelector('#overlay');
    this.btn = shadow.querySelector('#sidebar-btn');

    this.btn.addEventListener('click', () => this.toggleSidebar());
    this.overlay.addEventListener('click', () => this.closeSidebar());
  }

  toggleSidebar() {
    this.sidebar.classList.toggle('open');
    this.overlay.classList.toggle('active');
  }

  closeSidebar() {
    this.sidebar.classList.remove('open');
    this.overlay.classList.remove('active');
  }

  connectedCallback() {
    // Fechar sidebar pelos botões X dentro do slot
    const slot = this.shadow.querySelector('slot[name="sidebar"]');
    slot.addEventListener('slotchange', () => {
      const nodes = slot.assignedElements({ flatten: true });
      if (!nodes.length) return;

      // Busca todos os botões com id="close-btn-sidebar" dentro do conteúdo do slot
      nodes.forEach(node => {
        const closeBtns = node.querySelectorAll('#close-btn-sidebar');
        closeBtns.forEach(btn => {
          btn.addEventListener('click', () => this.closeSidebar());
        });
      });
    });
  }
}

customElements.define('my-navbar', MyNavbar);
