class Sidebar extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .sidebar {
                    width: 280px;
                    height: 100vh;
                    background: #ffffff;
                    border-right: 1px solid #e2e8f0;
                    position: fixed;
                    left: 0;
                    top: 0;
                    z-index: 1000;
                    overflow-y: auto;
                    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
                }
                
                .sidebar-header {
                    padding: 2rem 1.5rem 1rem;
                    border-bottom: 1px solid #f1f5f9;
                }
                
                .logo {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1e293b;
                    text-decoration: none;
                    display: block;
                }
                
                .nav-section {
                    padding: 1.5rem 0;
                }
                
                .nav-title {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 0 1.5rem 0.75rem;
                    margin: 0;
                }
                
                .nav-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                
                .nav-item {
                    margin: 0;
                }
                
                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1.5rem;
                    color: #64748b;
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                    border-radius: 0;
                    position: relative;
                }
                
                .nav-link:hover {
                    background: #f8fafc;
                    color: #0f172a;
                }
                
                .nav-link.active {
                    background: #0d9488;
                    color: #ffffff;
                }
                
                .nav-link.active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: #ffffff;
                }
                
                .nav-icon {
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                }
                
                .help-card {
                    margin: 1.5rem;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                    border-radius: 12px;
                    color: white;
                    position: relative;
                    overflow: hidden;
                }
                
                .help-card::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 100%;
                    height: 100%;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="wave" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 10 Q5 0 10 10 T20 10" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/></pattern></defs><rect width="100" height="100" fill="url(%23wave)"/></svg>');
                    opacity: 0.3;
                }
                
                .help-content {
                    position: relative;
                    z-index: 1;
                }
                
                .help-icon {
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1rem;
                    font-size: 1.25rem;
                    color: white;
                }
                
                .help-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                
                .help-text {
                    font-size: 0.75rem;
                    opacity: 0.9;
                    margin-bottom: 1rem;
                    line-height: 1.4;
                }
                
                .help-button {
                    background: white;
                    color: #0d9488;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    width: 100%;
                }
                
                .help-button:hover {
                    background: #f8fafc;
                    transform: translateY(-1px);
                }
                
                @media (max-width: 1024px) {
                    .sidebar {
                        transform: translateX(-100%);
                        transition: transform 0.3s ease;
                    }
                    
                    .sidebar.open {
                        transform: translateX(0);
                    }
                }
            </style>
            
            <div class="sidebar">
                <div class="sidebar-header">
                    <a href="#" class="logo">TrackPoint</a>
                </div>
                
                <div class="nav-section">
                    <ul class="nav-list">
                        <li class="nav-item">
                            <a href="/manager/visao-geral" class="nav-link" data-page="visao-geral">
                                <i class="nav-icon fas fa-home"></i>
                                Visão Geral
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/manager/horas-extras" class="nav-link" data-page="horas-extras">
                                <i class="nav-icon fas fa-chart-bar"></i>
                                Horas Extras
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/manager/horas-projeto" class="nav-link" data-page="horas-projeto">
                                <i class="nav-icon fas fa-calendar-alt"></i>
                                Horas em Projetos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="#" class="nav-link">
                                <i class="nav-icon fas fa-shield-alt"></i>
                                Proteção de Dados
                            </a>
                        </li>
                    </ul>
                </div>
                
                <div class="nav-section">
                    <h3 class="nav-title">ÁREA DO USUÁRIO</h3>
                    <ul class="nav-list">
                        <li class="nav-item">
                            <a href="#" class="nav-link">
                                <i class="nav-icon fas fa-user"></i>
                                Perfil
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="#" class="nav-link">
                                <i class="nav-icon fas fa-cog"></i>
                                Configurações
                            </a>
                        </li>
                    </ul>
                </div>
                
                <div class="help-card">
                    <div class="help-content">
                        <div class="help-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="17" r="1" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="help-title">Precisa de ajuda?</div>
                        <div class="help-text">Veja nossa documentação</div>
                        <button class="help-button">DOCUMENTAÇÃO</button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar eventos de navegação
        this.setupNavigation();
        this.setupHelpButton();
    }
    
    setupHelpButton() {
        const helpButton = this.shadowRoot.querySelector('.help-button');
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                // Implementar ação de ajuda/documentação
                console.log('Abrindo documentação...');
                // Aqui você pode abrir um modal, redirecionar para documentação, etc.
                alert('Documentação em desenvolvimento!');
            });
        }
    }
    
    setupNavigation() {
        const links = this.shadowRoot.querySelectorAll('.nav-link[data-page]');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                // Navega diretamente para a URL do link
                if (href) {
                    window.location.href = href;
                }
                // Marca visualmente como ativo
                const page = link.getAttribute('data-page');
                this.setActivePage(page);
            });
        });
    }
    
    
    setActivePage(page) {
        const allLinks = this.shadowRoot.querySelectorAll('.nav-link');
        allLinks.forEach(link => link.classList.remove('active'));
        
        const activeLink = this.shadowRoot.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

customElements.define('app-sidebar', Sidebar);
