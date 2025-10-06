class QuickAction extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        const icon = this.getAttribute('icon') || 'fas fa-plus';
        const label = this.getAttribute('label') || 'Ação';
        const color = this.getAttribute('color') || 'primary';
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    font-family: 'Inter', sans-serif;
                }
                
                .quick-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    border: none;
                    border-radius: 10px;
                    font-weight: 500;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    position: relative;
                    overflow: hidden;
                }
                
                .quick-action::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    transition: left 0.5s ease;
                }
                
                .quick-action:hover::before {
                    left: 100%;
                }
                
                .quick-action:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                .quick-action:active {
                    transform: translateY(0);
                }
                
                .action-icon {
                    font-size: 1rem;
                    transition: transform 0.3s ease;
                }
                
                .quick-action:hover .action-icon {
                    transform: scale(1.1);
                }
                
                .action-label {
                    font-weight: 500;
                }
                
                /* Cores dos temas */
                .primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                
                .secondary {
                    background: #e2e8f0;
                    color: #4a5568;
                }
                
                .success {
                    background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
                    color: white;
                }
                
                .warning {
                    background: linear-gradient(135deg, #dd6b20 0%, #c05621 100%);
                    color: white;
                }
                
                .danger {
                    background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
                    color: white;
                }
                
                .info {
                    background: linear-gradient(135deg, #3182ce 0%, #2c5aa0 100%);
                    color: white;
                }
                
                .light {
                    background: #f7fafc;
                    color: #2d3748;
                    border: 1px solid #e2e8f0;
                }
                
                .dark {
                    background: #2d3748;
                    color: white;
                }
                
                /* Responsividade */
                @media (max-width: 768px) {
                    .quick-action {
                        padding: 0.625rem 1rem;
                        font-size: 0.8rem;
                    }
                    
                    .action-icon {
                        font-size: 0.875rem;
                    }
                }
            </style>
            
            <button class="quick-action ${color}">
                <i class="action-icon ${icon}"></i>
                <span class="action-label">${label}</span>
            </button>
        `;
        
        // Adicionar evento de clique
        const button = shadow.querySelector('.quick-action');
        button.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('action-click', {
                detail: { 
                    icon, 
                    label, 
                    color 
                },
                bubbles: true
            }));
        });
    }
}

customElements.define('quick-action', QuickAction);
