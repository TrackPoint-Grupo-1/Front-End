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
          padding: 15px 55px;
          background-color: #008781;
          color: white;
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .back-button {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          background-color: rgba(255, 255, 255, 0.2) !important;
          border: 2px solid rgba(255, 255, 255, 0.4) !important;
          border-radius: 8px !important;
          padding: 10px 16px !important;
          color: white !important;
          text-decoration: none !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          margin-right: 15px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
        }

        .back-button:hover {
          background-color: rgba(255, 255, 255, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.6) !important;
          transform: translateX(-3px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }

        .back-button:active {
          transform: translateX(-1px) !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
        }

        .back-icon {
          font-size: 16px !important;
          font-weight: bold !important;
          transition: transform 0.3s ease !important;
        }

        .back-button:hover .back-icon {
          transform: translateX(-2px) !important;
        }

        #sidebar-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

        .hamburger-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          margin-right: 15px;
          padding: 5px;
          border-radius: 4px;
          transition: background-color 0.3s ease;
        }

        .hamburger-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        aside#sidebar {
          position: fixed;
          top: 0;
          right: -100%;
          width: 40%;
          height: 100vh;
          background: white;
          box-shadow: -2px 0 8px rgba(0,0,0,0.3);
          transition: right 0.3s ease;
          overflow-y: auto;
          z-index: 1001;
          padding: 30px;
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
          .back-button {
            padding: 8px 12px;
            font-size: 12px;
            margin-right: 10px;
            gap: 6px;
          }
          
          .back-icon {
            font-size: 14px;
          }
        }

        @media(max-width: 480px) {
          .back-button {
            padding: 6px 10px;
            font-size: 11px;
            margin-right: 8px;
            gap: 4px;
          }
          
          .back-icon {
            font-size: 12px;
          }
        }
      </style>

      <nav>
        <div class="navbar-left">
          <slot name="back"></slot>
          <slot name="left"></slot>
        </div>
      </nav>
    `;

    this.sidebar = shadow.querySelector('#sidebar');
    this.overlay = shadow.querySelector('#overlay');
    this.btn = shadow.querySelector('#sidebar-btn');

    this.btn.addEventListener('click', () => this.toggleSidebar());
    this.overlay.addEventListener('click', () => this.closeSidebar());
  }

  // Métodos do menu hamburger removidos

  connectedCallback() {
    // Menu hamburger removido - não há mais sidebar para gerenciar
  }
}

customElements.define('my-navbar', MyNavbar);
