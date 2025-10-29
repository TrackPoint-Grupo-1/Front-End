// Sistema de Navegação - Dashboard Manager

class NavigationManager {
    constructor() {
        this.currentPage = 'visao-geral';
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Escutar mudanças de página da sidebar
        document.addEventListener('page-change', (event) => {
            this.navigateToPage(event.detail.page);
        });

        // Escutar toggle da sidebar mobile
        document.addEventListener('toggle-sidebar', () => {
            this.toggleSidebar();
        });

        // Escutar busca
        // Debounce da busca para evitar travamentos
        let searchTimeout = null;
        document.addEventListener('search', (event) => {
            const query = event.detail.query || '';
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearch(query);
            }, 150);
        });
    }

    navigateToPage(page) {
        const pageMap = {
            'visao-geral': '/manager/visao-geral.html',
            'horas-extras': '/manager/horas-extras.html',
            'horas-projeto': '/manager/horas-projeto.html'
        };

        const url = pageMap[page];
        if (url && this.currentPage !== page) {
            this.currentPage = page;
            window.location.href = url;
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('app-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    handleSearch(query) {
        // Se a busca estiver vazia, mostra tudo
        if (!query || !query.trim()) {
            this.resetTableFilters();
            return;
        }
        // Filtra tabelas visíveis na página atual
        this.filterVisibleTables(query.trim());
    }

    performGlobalSearch(query) {
        // Implementar busca global no dashboard
        const searchResults = {
            'funcionarios': this.searchEmployees(query),
            'projetos': this.searchProjects(query),
            'relatorios': this.searchReports(query)
        };

        console.log('Resultados da busca:', searchResults);
    }

    resetTableFilters() {
        const tables = document.querySelectorAll('.table');
        tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                row.style.display = '';
            });
        });
    }

    filterVisibleTables(query) {
        const normalized = query.toLowerCase();
        const tables = document.querySelectorAll('.table');
        tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(normalized) ? '' : 'none';
            });
        });
    }

    searchEmployees(query) {
        // Simular busca de funcionários
        return [
            { name: 'Ana Costa', department: 'TI', status: 'online' },
            { name: 'Carlos Santos', department: 'Financeiro', status: 'offline' }
        ].filter(emp => 
            emp.name.toLowerCase().includes(query.toLowerCase()) ||
            emp.department.toLowerCase().includes(query.toLowerCase())
        );
    }

    searchProjects(query) {
        // Simular busca de projetos
        return [
            { name: 'Projeto X', manager: 'Ester Jackson', status: 'ativo' },
            { name: 'Projeto Y', manager: 'James Martins', status: 'ativo' }
        ].filter(proj => 
            proj.name.toLowerCase().includes(query.toLowerCase()) ||
            proj.manager.toLowerCase().includes(query.toLowerCase())
        );
    }

    searchReports(query) {
        // Simular busca de relatórios
        return [
            { name: 'Relatório Mensal', type: 'horas-extras', date: '2025-01-15' },
            { name: 'Relatório de Projetos', type: 'projetos', date: '2025-01-14' }
        ].filter(rep => 
            rep.name.toLowerCase().includes(query.toLowerCase()) ||
            rep.type.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Métodos para navegação programática
    goToVisaoGeral() {
        this.navigateToPage('visao-geral');
    }

    goToHorasExtras() {
        this.navigateToPage('horas-extras');
    }

    goToHorasProjeto() {
        this.navigateToPage('horas-projeto');
    }

    // Métodos para ações rápidas
    exportReport(type) {
        console.log(`Exportando relatório: ${type}`);
        // Implementar lógica de exportação
        this.showNotification('Relatório exportado com sucesso!', 'success');
    }

    openSettings() {
        console.log('Abrindo configurações...');
        // Implementar modal de configurações
        this.showNotification('Configurações em desenvolvimento', 'info');
    }

    addNewEmployee() {
        console.log('Abrindo formulário de novo funcionário...');
        // Implementar modal de cadastro
        this.showNotification('Formulário de cadastro em desenvolvimento', 'info');
    }

    showNotification(message, type = 'info') {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Estilos da notificação
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '9999',
            animation: 'slideInRight 0.3s ease-out'
        });

        // Cores por tipo
        const colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#ea580c',
            info: '#2563eb'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar o gerenciador de navegação
const navigationManager = new NavigationManager();

// Adicionar estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Exportar para uso global
window.navigationManager = navigationManager;
