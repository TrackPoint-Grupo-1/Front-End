class AppHeader extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .header {
                    background: #ffffff;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 1rem 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .breadcrumb {
                    font-size: 0.75rem;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .breadcrumb-separator {
                    color: #cbd5e1;
                }
                
                .page-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0;
                }
                
                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .search-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                
                .search-input {
                    width: 300px;
                    padding: 0.5rem 1rem 0.5rem 2.5rem;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    background: #f9fafb;
                    transition: all 0.2s ease;
                }
                
                .search-input:focus {
                    outline: none;
                    border-color: #0d9488;
                    background: #ffffff;
                    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
                }
                
                .search-icon {
                    position: absolute;
                    left: 0.75rem;
                    color: #6b7280;
                    font-size: 0.875rem;
                }
                
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .action-button {
                    width: 40px;
                    height: 40px;
                    border: none;
                    background: #f8fafc;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #64748b;
                    font-size: 1rem;
                }
                
                .action-button:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }
                
                .user-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #0d9488;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .user-avatar:hover {
                    background: #0f766e;
                    transform: scale(1.05);
                }
                
                .mobile-menu-btn {
                    display: none;
                    width: 40px;
                    height: 40px;
                    border: none;
                    background: #f8fafc;
                    border-radius: 8px;
                    cursor: pointer;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    font-size: 1.25rem;
                }
                
                @media (max-width: 1024px) {
                    .header {
                        padding: 1rem;
                    }
                    
                    .search-input {
                        width: 200px;
                    }
                    
                    .mobile-menu-btn {
                        display: flex;
                    }
                }
                
                @media (max-width: 768px) {
                    .search-container {
                        display: none;
                    }
                    
                    .header-actions {
                        gap: 0.25rem;
                    }
                    
                    .action-button {
                        width: 36px;
                        height: 36px;
                    }
                }
            </style>
            
            <div class="header">
                <div class="header-left">
                    <div class="breadcrumb">
                        <span>Páginas</span>
                        <span class="breadcrumb-separator">/</span>
                        <span>Dashboard</span>
                        <span class="breadcrumb-separator">/</span>
                        <span id="current-page">Visão Geral</span>
                    </div>
                    <h1 class="page-title">Dashboard</h1>
                </div>
                
                <div class="header-right">
                    <div class="search-container">
                        <i class="search-icon fas fa-search"></i>
                        <input type="text" class="search-input" placeholder="O que procura?">
                    </div>
                    
                    <div class="header-actions">
                        <button class="action-button" title="Notificações">
                            <i class="fas fa-bell"></i>
                        </button>
                        <button class="action-button" title="Configurações">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="action-button" title="Ajuda">
                            <i class="fas fa-question-circle"></i>
                        </button>
                        <div class="user-avatar" title="Perfil do usuário">
                            JS
                        </div>
                    </div>
                    
                    <button class="mobile-menu-btn" id="mobile-menu-btn">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Evento para abrir menu mobile
        const mobileMenuBtn = this.shadowRoot.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('toggle-sidebar', {
                    bubbles: true,
                    composed: true
                }));
            });
        }
        
        // Evento para busca
        const searchInput = this.shadowRoot.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.dispatchEvent(new CustomEvent('search', {
                    detail: { query: e.target.value },
                    bubbles: true,
                    composed: true
                }));
            });
        }
    }
    
    updateBreadcrumb(pageName) {
        const currentPageElement = this.shadowRoot.getElementById('current-page');
        if (currentPageElement) {
            currentPageElement.textContent = pageName;
        }
    }
}

customElements.define('app-header', AppHeader);
