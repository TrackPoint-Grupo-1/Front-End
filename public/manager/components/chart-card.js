class ChartCard extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        const title = this.getAttribute('title') || 'Gráfico';
        const type = this.getAttribute('type') || 'bar';
        const id = this.getAttribute('id') || 'chart';
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .chart-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                }
                
                .chart-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                }
                
                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid #f7fafc;
                }
                
                .chart-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1a202c;
                }
                
                .chart-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .chart-btn {
                    padding: 0.5rem;
                    border: none;
                    background: #f7fafc;
                    color: #4a5568;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 0.875rem;
                }
                
                .chart-btn:hover {
                    background: #edf2f7;
                    color: #2d3748;
                }
                
                .chart-container {
                    position: relative;
                    height: 300px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .chart-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #718096;
                    text-align: center;
                }
                
                .chart-placeholder i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    color: #cbd5e0;
                }
                
                .chart-placeholder p {
                    font-size: 1rem;
                    font-weight: 500;
                }
                
                .chart-placeholder span {
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }
                
                /* Gráfico de barras simples */
                .bar-chart {
                    display: flex;
                    align-items: end;
                    gap: 0.5rem;
                    height: 200px;
                    width: 100%;
                }
                
                .bar {
                    flex: 1;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 4px 4px 0 0;
                    position: relative;
                    transition: all 0.3s ease;
                }
                
                .bar:hover {
                    opacity: 0.8;
                    transform: scaleY(1.05);
                }
                
                .bar-label {
                    position: absolute;
                    bottom: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.75rem;
                    color: #718096;
                    font-weight: 500;
                }
                
                .bar-value {
                    position: absolute;
                    top: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.75rem;
                    color: #2d3748;
                    font-weight: 600;
                }
                
                /* Gráfico de linha simples */
                .line-chart {
                    position: relative;
                    width: 100%;
                    height: 200px;
                }
                
                .line-path {
                    fill: none;
                    stroke: #667eea;
                    stroke-width: 3;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                .line-points {
                    fill: #667eea;
                }
                
                .line-point {
                    r: 4;
                    fill: white;
                    stroke: #667eea;
                    stroke-width: 2;
                }
            </style>
            
            <div class="chart-card">
                <div class="chart-header">
                    <div class="chart-title">${title}</div>
                    <div class="chart-actions">
                        <button class="chart-btn">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="chart-btn">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                <div class="chart-container">
                    <div id="${id}" class="chart-${type}">
                        ${this.createChartContent(type)}
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar dados de exemplo após o componente ser montado
        setTimeout(() => this.loadChartData(type, id), 100);
    }
    
    createChartContent(type) {
        if (type === 'bar') {
            return `
                <div class="bar-chart">
                    <div class="bar" style="height: 60%">
                        <div class="bar-value">45</div>
                        <div class="bar-label">TI</div>
                    </div>
                    <div class="bar" style="height: 80%">
                        <div class="bar-value">62</div>
                        <div class="bar-label">RH</div>
                    </div>
                    <div class="bar" style="height: 40%">
                        <div class="bar-value">28</div>
                        <div class="bar-label">Vendas</div>
                    </div>
                    <div class="bar" style="height: 90%">
                        <div class="bar-value">78</div>
                        <div class="bar-label">Marketing</div>
                    </div>
                    <div class="bar" style="height: 55%">
                        <div class="bar-value">38</div>
                        <div class="bar-label">Financeiro</div>
                    </div>
                </div>
            `;
        } else if (type === 'line') {
            return `
                <div class="chart-placeholder">
                    <i class="fas fa-chart-line"></i>
                    <p>Gráfico de Tendência</p>
                    <span>Dados serão carregados em breve</span>
                </div>
            `;
        }
        return `
            <div class="chart-placeholder">
                <i class="fas fa-chart-area"></i>
                <p>Gráfico ${type}</p>
                <span>Visualização em desenvolvimento</span>
            </div>
        `;
    }
    
    loadChartData(type, id) {
        // Simular carregamento de dados
        console.log(`Carregando dados do gráfico ${type} com ID ${id}`);
    }
}

customElements.define('chart-card', ChartCard);
