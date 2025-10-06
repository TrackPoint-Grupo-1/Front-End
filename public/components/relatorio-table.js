class RelatorioTable extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        const type = this.getAttribute('type') || 'hours';
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }
                
                .table-container {
                    overflow-x: auto;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }
                
                .table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }
                
                .table th {
                    background: #f9fafb;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .table td {
                    padding: 1rem;
                    border-bottom: 1px solid #f3f4f6;
                    color: #374151;
                    vertical-align: middle;
                }
                
                .table tbody tr:hover {
                    background: #f9fafb;
                }
                
                .table tbody tr:last-child td {
                    border-bottom: none;
                }
                
                .action-cell {
                    font-weight: 500;
                }
                
                .hours-cell {
                    font-family: 'Courier New', monospace;
                    font-weight: 500;
                }
                
                .justification-cell {
                    color: #6b7280;
                    font-style: italic;
                }
                
                .edit-btn {
                    background: none;
                    border: none;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                
                .edit-btn:hover {
                    color: #374151;
                    background: #f3f4f6;
                }
                
                .empty-message {
                    text-align: center;
                    padding: 2rem;
                    color: #6b7280;
                    font-style: italic;
                }
            </style>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        ${this.getTableHeaders(type)}
                    </thead>
                    <tbody>
                        ${this.getTableBody(type)}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    getTableHeaders(type) {
        if (type === 'hours') {
            return `
                <tr>
                    <th>Ação</th>
                    <th>Horas</th>
                    <th>Justificativa</th>
                    <th>Editar</th>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <th>Ação</th>
                    <th>Descrição</th>
                    <th>Horas</th>
                    <th>Nome</th>
                    <th>Editar</th>
                </tr>
            `;
        }
    }
    
    getTableBody(type) {
        if (type === 'hours') {
            return `
                <tr>
                    <td class="action-cell">Marcação de Ponto</td>
                    <td class="hours-cell">08:00</td>
                    <td class="justification-cell"></td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="action-cell">Marcação de Ponto</td>
                    <td class="hours-cell">12:00</td>
                    <td class="justification-cell"></td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="action-cell">Marcação de Ponto</td>
                    <td class="hours-cell">13:00</td>
                    <td class="justification-cell"></td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="action-cell">Marcação de Ponto</td>
                    <td class="hours-cell">17:30</td>
                    <td class="justification-cell"></td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="action-cell">Hora Extra</td>
                    <td class="hours-cell">00:30</td>
                    <td class="justification-cell">Pré-Definida</td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td class="action-cell">Apontamento de Projetos</td>
                    <td>Projeto</td>
                    <td class="hours-cell">06:00</td>
                    <td>Projeto Itaú</td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="action-cell">Apontamento de Projetos</td>
                    <td>Reunião</td>
                    <td class="hours-cell">01:30</td>
                    <td>Reunião 2025</td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="action-cell">Apontamento de Projetos</td>
                    <td>Treinamento</td>
                    <td class="hours-cell">01:00</td>
                    <td>Treinamento</td>
                    <td>
                        <button class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    updateData(data) {
        const tbody = this.shadowRoot.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = this.generateTableRows(data);
        }
    }
    
    generateTableRows(data) {
        const type = this.getAttribute('type') || 'hours';
        
        if (!data || data.length === 0) {
            return `
                <tr>
                    <td colspan="${type === 'hours' ? '4' : '5'}" class="empty-message">
                        Nenhum registro encontrado
                    </td>
                </tr>
            `;
        }
        
        return data.map(item => {
            if (type === 'hours') {
                return `
                    <tr>
                        <td class="action-cell">${item.action}</td>
                        <td class="hours-cell">${item.hours}</td>
                        <td class="justification-cell">${item.justification || ''}</td>
                        <td>
                            <button class="edit-btn" data-id="${item.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                return `
                    <tr>
                        <td class="action-cell">${item.action}</td>
                        <td>${item.description}</td>
                        <td class="hours-cell">${item.hours}</td>
                        <td>${item.name}</td>
                        <td>
                            <button class="edit-btn" data-id="${item.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
        }).join('');
    }
    
    connectedCallback() {
        // Adicionar eventos de clique nos botões de editar
        const editButtons = this.shadowRoot.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                this.handleEdit(id);
            });
        });
    }
    
    handleEdit(id) {
        console.log('Editando item:', id);
        // Implementar lógica de edição
        this.dispatchEvent(new CustomEvent('edit-item', {
            detail: { id },
            bubbles: true
        }));
    }
}

customElements.define('relatorio-table', RelatorioTable);
