class MetricCard extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        const title = this.getAttribute('title') || '';
        const value = this.getAttribute('value') || '0';
        const change = this.getAttribute('change') || '0%';
        const trend = this.getAttribute('trend') || 'neutral';
        const icon = this.getAttribute('icon') || 'fas fa-chart-line';
        const color = this.getAttribute('color') || 'blue';
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .metric-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .metric-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                }
                
                .metric-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--color-primary);
                }
                
                .metric-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }
                
                .metric-title {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #718096;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .metric-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    color: white;
                    background: var(--color-primary);
                }
                
                .metric-value {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #1a202c;
                    margin-bottom: 0.5rem;
                    line-height: 1;
                }
                
                .metric-change {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                
                .metric-change.up {
                    color: #38a169;
                }
                
                .metric-change.down {
                    color: #e53e3e;
                }
                
                .metric-change.neutral {
                    color: #718096;
                }
                
                .trend-icon {
                    font-size: 0.75rem;
                }
                
                /* Cores dos temas */
                .blue { --color-primary: #3182ce; }
                .green { --color-primary: #38a169; }
                .orange { --color-primary: #dd6b20; }
                .purple { --color-primary: #805ad5; }
                .red { --color-primary: #e53e3e; }
                .pink { --color-primary: #d53f8c; }
                .teal { --color-primary: #319795; }
                .indigo { --color-primary: #5a67d8; }
            </style>
            
            <div class="metric-card ${color}">
                <div class="metric-header">
                    <div class="metric-title">${title}</div>
                    <div class="metric-icon">
                        <i class="${icon}"></i>
                    </div>
                </div>
                <div class="metric-value">${value}</div>
                <div class="metric-change ${trend}">
                    <i class="trend-icon fas fa-arrow-${trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'right'}"></i>
                    <span>${change}</span>
                </div>
            </div>
        `;
    }
}

customElements.define('metric-card', MetricCard);
