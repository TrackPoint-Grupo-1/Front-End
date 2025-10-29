import { get, patch, post } from "../../integration/connection.js";

class DashboardDataManager {
    constructor() {
        this.baseUrl = "/track";
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    // Métodos para buscar dados do dashboard
    async getManagerMetrics() {
        try {
            const cacheKey = 'manager-metrics';
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await get('/dashboard/metrics');
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Erro ao buscar métricas do gestor:', error);
            return this.getDefaultMetrics();
        }
    }

    async getEmployeeData() {
        try {
            const cacheKey = 'employee-data';
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            const response = await get('/dashboard/employees');
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Erro ao buscar dados dos funcionários:', error);
            return this.getDefaultEmployeeData();
        }
    }

    async getRecentActivities() {
        try {
            const response = await get('/dashboard/activities');
            return response;
        } catch (error) {
            console.error('Erro ao buscar atividades recentes:', error);
            return this.getDefaultActivities();
        }
    }

    async getAlerts() {
        try {
            const response = await get('/dashboard/alerts');
            return response;
        } catch (error) {
            console.error('Erro ao buscar alertas:', error);
            return this.getDefaultAlerts();
        }
    }

    async getChartData(chartType) {
        try {
            const response = await get(`/dashboard/charts/${chartType}`);
            return response;
        } catch (error) {
            console.error(`Erro ao buscar dados do gráfico ${chartType}:`, error);
            return this.getDefaultChartData(chartType);
        }
    }

    // Métodos para atualizar dados
    async updateEmployeeStatus(employeeId, status) {
        try {
            const response = await patch(`/employees/${employeeId}/status`, { status });
            this.clearCache('employee-data');
            return response;
        } catch (error) {
            console.error('Erro ao atualizar status do funcionário:', error);
            throw error;
        }
    }

    async approveTimeAdjustment(adjustmentId) {
        try {
            const response = await patch(`/adjustments/${adjustmentId}/approve`);
            this.clearCache('manager-metrics');
            return response;
        } catch (error) {
            console.error('Erro ao aprovar ajuste de ponto:', error);
            throw error;
        }
    }

    async exportReport(reportType, filters = {}) {
        try {
            const response = await post('/reports/export', {
                type: reportType,
                filters: filters
            });
            return response;
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            throw error;
        }
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

    clearCache(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Dados padrão para fallback
    getDefaultMetrics() {
        return {
            activeEmployees: 127,
            hoursWorkedToday: 1247,
            pendingPoints: 23,
            productivity: 94
        };
    }

    getDefaultEmployeeData() {
        return [
            {
                id: 1,
                name: "Ana Costa",
                role: "Desenvolvedora",
                department: "TI",
                status: "online",
                hours: "8h 30m",
                avatar: "../assets/user.jpg"
            },
            {
                id: 2,
                name: "Carlos Santos",
                role: "Analista",
                department: "Financeiro",
                status: "offline",
                hours: "7h 45m",
                avatar: "../assets/user.jpg"
            },
            {
                id: 3,
                name: "Maria Oliveira",
                role: "Designer",
                department: "Marketing",
                status: "break",
                hours: "6h 15m",
                avatar: "../assets/user.jpg"
            },
            {
                id: 4,
                name: "Pedro Lima",
                role: "Gerente",
                department: "Vendas",
                status: "online",
                hours: "9h 00m",
                avatar: "../assets/user.jpg"
            }
        ];
    }

    getDefaultActivities() {
        return [
            {
                id: 1,
                type: "success",
                message: "Ana Costa bateu o ponto de saída",
                timestamp: "5 minutos atrás"
            },
            {
                id: 2,
                type: "warning",
                message: "Carlos Santos solicitou ajuste de ponto",
                timestamp: "15 minutos atrás"
            },
            {
                id: 3,
                type: "info",
                message: "Maria Oliveira iniciou intervalo",
                timestamp: "30 minutos atrás"
            },
            {
                id: 4,
                type: "primary",
                message: "Novo funcionário Pedro Lima cadastrado",
                timestamp: "1 hora atrás"
            }
        ];
    }

    getDefaultAlerts() {
        return [
            {
                id: 1,
                type: "critical",
                title: "Ponto não batido",
                message: "5 funcionários não bateram o ponto de entrada hoje",
                action: "Ver detalhes"
            },
            {
                id: 2,
                type: "warning",
                title: "Horas extras",
                message: "12 funcionários ultrapassaram o limite de horas",
                action: "Aprovar"
            },
            {
                id: 3,
                type: "info",
                title: "Férias pendentes",
                message: "8 solicitações de férias aguardando aprovação",
                action: "Revisar"
            }
        ];
    }

    getDefaultChartData(chartType) {
        if (chartType === 'hours-by-department') {
            return {
                labels: ['TI', 'RH', 'Vendas', 'Marketing', 'Financeiro'],
                data: [45, 62, 28, 78, 38]
            };
        } else if (chartType === 'punctuality-trend') {
            return {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                data: [85, 88, 92, 89, 94, 96]
            };
        }
        return { labels: [], data: [] };
    }
}

// Instância global do gerenciador de dados
const dashboardData = new DashboardDataManager();

// Inicialização do dashboard quando a página carrega
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Carregar dados iniciais
        await loadDashboardData();
        
        // Configurar atualizações automáticas
        setupAutoRefresh();
        
        // Configurar eventos dos componentes
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
    }
});

async function loadDashboardData() {
    try {
        // Carregar métricas
        const metrics = await dashboardData.getManagerMetrics();
        updateMetricsDisplay(metrics);
        
        // Carregar funcionários
        const employees = await dashboardData.getEmployeeData();
        updateEmployeesDisplay(employees);
        
        // Carregar atividades
        const activities = await dashboardData.getRecentActivities();
        updateActivitiesDisplay(activities);
        
        // Carregar alertas
        const alerts = await dashboardData.getAlerts();
        updateAlertsDisplay(alerts);
        
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
    }
}

function updateMetricsDisplay(metrics) {
    // Atualizar cards de métricas se existirem
    const metricCards = document.querySelectorAll('metric-card');
    if (metricCards.length > 0) {
        // Lógica para atualizar métricas baseada nos dados recebidos
        console.log('Métricas carregadas:', metrics);
    }
}

function updateEmployeesDisplay(employees) {
    // Atualizar cards de funcionários se existirem
    const employeeCards = document.querySelectorAll('employee-card');
    if (employeeCards.length > 0) {
        // Lógica para atualizar funcionários baseada nos dados recebidos
        console.log('Funcionários carregados:', employees);
    }
}

function updateActivitiesDisplay(activities) {
    // Atualizar lista de atividades se existir
    const activitiesList = document.querySelector('.activities-list');
    if (activitiesList) {
        // Lógica para atualizar atividades baseada nos dados recebidos
        console.log('Atividades carregadas:', activities);
    }
}

function updateAlertsDisplay(alerts) {
    // Atualizar alertas se existirem
    const alertsGrid = document.querySelector('.alerts-grid');
    if (alertsGrid) {
        // Lógica para atualizar alertas baseada nos dados recebidos
        console.log('Alertas carregados:', alerts);
    }
}

function setupAutoRefresh() {
    // Atualizar dados a cada 5 minutos
    setInterval(async () => {
        try {
            await loadDashboardData();
        } catch (error) {
            console.error('Erro na atualização automática:', error);
        }
    }, 5 * 60 * 1000);
}

function setupEventListeners() {
    // Eventos para quick actions
    document.addEventListener('action-click', (event) => {
        const { icon, label, color } = event.detail;
        handleQuickAction(icon, label, color);
    });
    
    // Eventos para cards de funcionários
    document.addEventListener('click', (event) => {
        const employeeCard = event.target.closest('employee-card');
        if (employeeCard) {
            handleEmployeeCardClick(employeeCard);
        }
    });
}

function handleQuickAction(icon, label, color) {
    console.log('Ação rápida clicada:', { icon, label, color });
    
    // Implementar lógica específica para cada ação
    switch (label) {
        case 'Exportar Relatório':
            exportReport();
            break;
        case 'Configurações':
            openSettings();
            break;
        case 'Novo Funcionário':
            openNewEmployeeForm();
            break;
        default:
            console.log('Ação não implementada:', label);
    }
}

function handleEmployeeCardClick(employeeCard) {
    const name = employeeCard.getAttribute('name');
    console.log('Card de funcionário clicado:', name);
    
    // Implementar navegação para detalhes do funcionário
    // window.location.href = `./employee-details.html?id=${employeeId}`;
}

async function exportReport() {
    try {
        const response = await dashboardData.exportReport('manager-dashboard');
        console.log('Relatório exportado:', response);
        // Implementar download do arquivo
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        alert('Erro ao exportar relatório. Tente novamente.');
    }
}

function openSettings() {
    console.log('Abrindo configurações...');
    // Implementar modal ou página de configurações
}

function openNewEmployeeForm() {
    console.log('Abrindo formulário de novo funcionário...');
    // Implementar modal ou página de cadastro
}

// Exportar para uso global
window.dashboardData = dashboardData;
