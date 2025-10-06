class DatePicker extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        const value = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || 'DD/MM/AAAA';
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .date-picker-container {
                    position: relative;
                    display: inline-block;
                }
                
                .date-input {
                    padding: 0.75rem 1rem;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 1rem;
                    background: white;
                    transition: all 0.2s ease;
                    min-width: 150px;
                    font-family: inherit;
                }
                
                .date-input:focus {
                    outline: none;
                    border-color: #0d9488;
                    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
                }
                
                .date-input::placeholder {
                    color: #9ca3af;
                }
                
                .calendar-icon {
                    position: absolute;
                    right: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6b7280;
                    pointer-events: none;
                }
            </style>
            
            <div class="date-picker-container">
                <input 
                    type="date" 
                    class="date-input" 
                    value="${value}"
                    placeholder="${placeholder}"
                />
                <i class="fas fa-calendar-alt calendar-icon"></i>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const input = this.shadowRoot.querySelector('.date-input');
        
        input.addEventListener('change', (e) => {
            const value = e.target.value;
            this.setAttribute('value', value);
            
            // Disparar evento customizado
            this.dispatchEvent(new CustomEvent('date-change', {
                detail: { value },
                bubbles: true
            }));
        });
    }
    
    getValue() {
        const input = this.shadowRoot.querySelector('.date-input');
        return input ? input.value : '';
    }
    
    setValue(value) {
        const input = this.shadowRoot.querySelector('.date-input');
        if (input) {
            input.value = value;
            this.setAttribute('value', value);
        }
    }
    
    clear() {
        this.setValue('');
    }
}

customElements.define('date-picker', DatePicker);
