class EmployeeCard extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        const name = this.getAttribute('name') || 'Funcionário';
        const role = this.getAttribute('role') || 'Cargo';
        const department = this.getAttribute('department') || 'Departamento';
        const status = this.getAttribute('status') || 'offline';
        const hours = this.getAttribute('hours') || '0h 00m';
        const avatar = this.getAttribute('avatar') || '../assets/user.jpg';
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .employee-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 1.25rem;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }
                
                .employee-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                }
                
                .employee-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--status-color);
                }
                
                .employee-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .employee-avatar {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid var(--status-color);
                    position: relative;
                }
                
                .status-indicator {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid white;
                    background: var(--status-color);
                }
                
                .employee-info h3 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 0.25rem;
                }
                
                .employee-info p {
                    font-size: 0.875rem;
                    color: #718096;
                    margin-bottom: 0.25rem;
                }
                
                .employee-info .department {
                    font-size: 0.75rem;
                    color: #a0aec0;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 500;
                }
                
                .employee-stats {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 1rem;
                    border-top: 1px solid #f7fafc;
                }
                
                .hours-worked {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .hours-label {
                    font-size: 0.75rem;
                    color: #718096;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 500;
                }
                
                .hours-value {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1a202c;
                }
                
                .status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    background: var(--status-bg);
                    color: var(--status-color);
                }
                
                /* Status colors */
                .online {
                    --status-color: #38a169;
                    --status-bg: #c6f6d5;
                }
                
                .offline {
                    --status-color: #718096;
                    --status-bg: #e2e8f0;
                }
                
                .break {
                    --status-color: #dd6b20;
                    --status-bg: #fef5e7;
                }
                
                .away {
                    --status-color: #d69e2e;
                    --status-bg: #fefcbf;
                }
                
                .busy {
                    --status-color: #e53e3e;
                    --status-bg: #fed7d7;
                }
                
                /* Animações */
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
                
                .status-indicator.online {
                    animation: pulse 2s infinite;
                }
            </style>
            
            <div class="employee-card ${status}">
                <div class="employee-header">
                    <div class="avatar-container">
                        <img src="${avatar}" alt="${name}" class="employee-avatar">
                        <div class="status-indicator ${status}"></div>
                    </div>
                    <div class="employee-info">
                        <h3>${name}</h3>
                        <p>${role}</p>
                        <span class="department">${department}</span>
                    </div>
                </div>
                <div class="employee-stats">
                    <div class="hours-worked">
                        <span class="hours-label">Horas Hoje</span>
                        <span class="hours-value">${hours}</span>
                    </div>
                    <div class="status-badge">${this.getStatusText(status)}</div>
                </div>
            </div>
        `;
    }
    
    getStatusText(status) {
        const statusMap = {
            'online': 'Online',
            'offline': 'Offline',
            'break': 'Intervalo',
            'away': 'Ausente',
            'busy': 'Ocupado'
        };
        return statusMap[status] || 'Desconhecido';
    }
}

customElements.define('employee-card', EmployeeCard);
