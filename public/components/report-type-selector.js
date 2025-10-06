class ReportTypeSelector extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .selector-container {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .type-button {
                    padding: 0.75rem 1.5rem;
                    border: 1px solid #d1d5db;
                    background: #f9fafb;
                    color: #6b7280;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: 500;
                    font-size: 0.875rem;
                    white-space: nowrap;
                }
                
                .type-button:hover {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .type-button.active {
                    background: #059669;
                    color: white;
                    border-color: #059669;
                }
                
                .type-button.active:hover {
                    background: #047857;
                }
                
                @media (max-width: 480px) {
                    .selector-container {
                        flex-direction: column;
                    }
                    
                    .type-button {
                        text-align: center;
                    }
                }
            </style>
            
            <div class="selector-container">
                <button class="type-button active" data-type="hours">
                    Relatório de Horas
                </button>
                <button class="type-button" data-type="projects">
                    Relatório de Projetos
                </button>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const buttons = this.shadowRoot.querySelectorAll('.type-button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const type = button.getAttribute('data-type');
                this.setActiveType(type);
                
                // Disparar evento customizado
                this.dispatchEvent(new CustomEvent('type-change', {
                    detail: { type },
                    bubbles: true
                }));
            });
        });
    }
    
    setActiveType(type) {
        const buttons = this.shadowRoot.querySelectorAll('.type-button');
        
        buttons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-type') === type) {
                button.classList.add('active');
            }
        });
    }
    
    getActiveType() {
        const activeButton = this.shadowRoot.querySelector('.type-button.active');
        return activeButton ? activeButton.getAttribute('data-type') : 'hours';
    }
}

customElements.define('report-type-selector', ReportTypeSelector);
