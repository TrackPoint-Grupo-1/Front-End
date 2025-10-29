// Integração de Dados - Relatório de Horas

class RelatorioDataManager {
    constructor() {
        this.baseUrl = "/track";
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    // Buscar dados do relatório de horas
    async getHoursReport(date) {
        try {
            const cacheKey = `hours-report-${date}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await fetch(`${this.baseUrl}/relatorio/horas?data=${date}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar relatório de horas');
            }

            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Erro ao buscar relatório de horas:', error);
            return this.getDefaultHoursData();
        }
    }

    // Buscar dados do relatório de projetos
    async getProjectsReport(date) {
        try {
            const cacheKey = `projects-report-${date}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await fetch(`${this.baseUrl}/relatorio/projetos?data=${date}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar relatório de projetos');
            }

            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Erro ao buscar relatório de projetos:', error);
            return this.getDefaultProjectsData();
        }
    }

    // Verificar inconsistências
    async checkInconsistencies(date) {
        try {
            const response = await fetch(`${this.baseUrl}/relatorio/inconsistencias?data=${date}`);
            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao verificar inconsistências:', error);
            return null;
        }
    }

    // Dados padrão para relatório de horas
    getDefaultHoursData() {
        return [
            {
                id: 1,
                action: 'Marcação de Ponto',
                hours: '08:00',
                justification: ''
            },
            {
                id: 2,
                action: 'Marcação de Ponto',
                hours: '12:00',
                justification: ''
            },
            {
                id: 3,
                action: 'Marcação de Ponto',
                hours: '13:00',
                justification: ''
            },
            {
                id: 4,
                action: 'Marcação de Ponto',
                hours: '17:30',
                justification: ''
            },
            {
                id: 5,
                action: 'Hora Extra',
                hours: '00:30',
                justification: 'Pré-Definida'
            }
        ];
    }

    // Dados padrão para relatório de projetos
    getDefaultProjectsData() {
        return [
            {
                id: 1,
                action: 'Apontamento de Projetos',
                description: 'Projeto',
                hours: '06:00',
                name: 'Projeto Itaú'
            },
            {
                id: 2,
                action: 'Apontamento de Projetos',
                description: 'Reunião',
                hours: '01:30',
                name: 'Reunião 2025'
            },
            {
                id: 3,
                action: 'Apontamento de Projetos',
                description: 'Treinamento',
                hours: '01:00',
                name: 'Treinamento'
            }
        ];
    }

    // Dados de exemplo com inconsistência
    getInconsistencyData() {
        return {
            hasInconsistency: true,
            message: 'Há inconsistências no seu apontamento de projetos!',
            detail: 'As horas em projetos não coincidem com as horas trabalhadas no dia. Ajuste seu apontamento.',
            missingHours: '02:30:00'
        };
    }

    // Métodos de cache
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    // Formatar data para exibição
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    // Validar data
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
}

// Instância global do gerenciador de dados
const relatorioData = new RelatorioDataManager();

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    // Configurar eventos globais
    setupGlobalEvents();
});

function setupGlobalEvents() {
    // Evento para editar item
    document.addEventListener('edit-item', (event) => {
        const { id } = event.detail;
        handleEditItem(id);
    });

    // Evento para adicionar item
    document.addEventListener('add-item', (event) => {
        const { type } = event.detail;
        handleAddItem(type);
    });
}

function handleEditItem(id) {
    console.log('Editando item:', id);
    // Implementar modal de edição
    alert(`Editando item ${id}`);
}

function handleAddItem(type) {
    console.log('Adicionando item do tipo:', type);
    // Implementar modal de adição
    alert(`Adicionando novo item do tipo ${type}`);
}

// Função para carregar relatório
async function loadReport(date, type) {
    try {
        let data;
        
        if (type === 'hours') {
            data = await relatorioData.getHoursReport(date);
        } else {
            data = await relatorioData.getProjectsReport(date);
        }

        // Verificar inconsistências
        const inconsistencies = await relatorioData.checkInconsistencies(date);
        
        return {
            data,
            inconsistencies,
            date: relatorioData.formatDate(date)
        };
    } catch (error) {
        console.error('Erro ao carregar relatório:', error);
        return {
            data: [],
            inconsistencies: null,
            date: relatorioData.formatDate(date),
            error: error.message
        };
    }
}

// Exportar para uso global
window.relatorioData = relatorioData;
window.loadReport = loadReport;
