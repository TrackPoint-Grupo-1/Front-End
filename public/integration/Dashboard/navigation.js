// Navegação do dashboard do manager
export function inicializarNavegacao() {
    // Configurar sidebar ativa
    const sidebar = document.querySelector('app-sidebar');
    if (sidebar) {
        const currentPage = getCurrentPage();
        sidebar.setActivePage(currentPage);
    }

    // Configurar breadcrumb
    const header = document.querySelector('app-header');
    if (header) {
        const pageTitle = getPageTitle();
        header.updateBreadcrumb(pageTitle);
    }

    // Configurar eventos de navegação
    configurarEventosNavegacao();
}

function getCurrentPage() {
    const path = window.location.pathname;
    
    if (path.includes('visao-geral')) return 'visao-geral';
    if (path.includes('horas-extras')) return 'horas-extras';
    if (path.includes('horas-projeto')) return 'horas-projeto';
    
    return 'visao-geral'; // padrão
}

function getPageTitle() {
    const path = window.location.pathname;
    
    if (path.includes('visao-geral')) return 'Visão Geral';
    if (path.includes('horas-extras')) return 'Horas Extras';
    if (path.includes('horas-projeto')) return 'Horas por Projeto';
    
    return 'Dashboard';
}

function configurarEventosNavegacao() {
    // Eventos de navegação entre páginas
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Interceptar navegação para páginas do manager
        if (href.includes('manager/')) {
            e.preventDefault();
            navegarParaPagina(href);
        }
    });

    // Eventos de botões de ação rápida
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        executarAcaoRapida(action, btn);
    });
}

function navegarParaPagina(href) {
    // Atualizar URL sem recarregar a página
    history.pushState(null, '', href);
    
    // Atualizar conteúdo da página
    carregarConteudoPagina(href);
    
    // Atualizar navegação
    inicializarNavegacao();
}

async function carregarConteudoPagina(href) {
    try {
        // Mostrar loading
        mostrarLoading();
        
        // Simular carregamento de conteúdo
        // Em uma implementação real, você faria uma requisição AJAX aqui
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Esconder loading
        esconderLoading();
        
        // Atualizar dados da página
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (usuarioLogado && usuarioLogado.id) {
            await atualizarDadosPagina(usuarioLogado.id, href);
        }
        
    } catch (error) {
        console.error("Erro ao carregar conteúdo da página:", error);
        esconderLoading();
    }
}

function executarAcaoRapida(action, btn) {
    switch (action) {
        case 'aprovar-solicitacao':
            aprovarSolicitacao(btn);
            break;
        case 'rejeitar-solicitacao':
            rejeitarSolicitacao(btn);
            break;
        case 'exportar-relatorio':
            exportarRelatorio(btn);
            break;
        case 'atualizar-dados':
            atualizarDados(btn);
            break;
        default:
            console.log("Ação não reconhecida:", action);
    }
}

async function aprovarSolicitacao(btn) {
    const solicitacaoId = btn.getAttribute('data-id');
    const tipo = btn.getAttribute('data-tipo');
    
    if (!solicitacaoId || !tipo) {
        alert('Erro: ID da solicitação não encontrado.');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'Aprovando...';
        
        // Fazer requisição para aprovar
        const endpoint = tipo === 'horas-extras' 
            ? `/horas-extras/${solicitacaoId}` 
            : `/solicitacoes/${solicitacaoId}/status`;
            
        const payload = tipo === 'horas-extras' 
            ? { foiAprovada: 'APROVADO' }
            : { status: 'APROVADO' };
            
        await fetch(`http://localhost:8080${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        // Remover linha da tabela
        const row = btn.closest('tr');
        if (row) {
            row.remove();
        }
        
        alert('Solicitação aprovada com sucesso!');
        
    } catch (error) {
        console.error("Erro ao aprovar solicitação:", error);
        alert('Erro ao aprovar solicitação. Tente novamente.');
        btn.disabled = false;
        btn.textContent = 'APROVAR';
    }
}

async function rejeitarSolicitacao(btn) {
    const solicitacaoId = btn.getAttribute('data-id');
    const tipo = btn.getAttribute('data-tipo');
    
    if (!solicitacaoId || !tipo) {
        alert('Erro: ID da solicitação não encontrado.');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'Rejeitando...';
        
        // Fazer requisição para rejeitar
        const endpoint = tipo === 'horas-extras' 
            ? `/horas-extras/${solicitacaoId}` 
            : `/solicitacoes/${solicitacaoId}/status`;
            
        const payload = tipo === 'horas-extras' 
            ? { foiAprovada: 'REJEITADO' }
            : { status: 'REJEITADO' };
            
        await fetch(`http://localhost:8080${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        // Remover linha da tabela
        const row = btn.closest('tr');
        if (row) {
            row.remove();
        }
        
        alert('Solicitação rejeitada com sucesso!');
        
    } catch (error) {
        console.error("Erro ao rejeitar solicitação:", error);
        alert('Erro ao rejeitar solicitação. Tente novamente.');
        btn.disabled = false;
        btn.textContent = 'REJEITAR';
    }
}

function exportarRelatorio(btn) {
    // Implementar exportação de relatório
    alert('Funcionalidade de exportação será implementada em breve.');
}

async function atualizarDados(btn) {
    try {
        btn.disabled = true;
        btn.textContent = 'Atualizando...';
        
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (usuarioLogado && usuarioLogado.id) {
            // Recarregar dados da página atual
            const currentPage = getCurrentPage();
            await atualizarDadosPagina(usuarioLogado.id, currentPage);
        }
        
        btn.disabled = false;
        btn.textContent = 'Atualizar';
        
    } catch (error) {
        console.error("Erro ao atualizar dados:", error);
        alert('Erro ao atualizar dados. Tente novamente.');
        btn.disabled = false;
        btn.textContent = 'Atualizar';
    }
}

async function atualizarDadosPagina(gerenteId, page) {
    // Esta função será implementada pelos módulos específicos
    console.log("Atualizando dados para página:", page, "gerente:", gerenteId);
}

function mostrarLoading() {
    const loading = document.createElement('div');
    loading.id = 'loading-overlay';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    loading.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
            <div>Carregando...</div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loading);
}

function esconderLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.remove();
    }
}

// Inicializar navegação quando o DOM carregar
document.addEventListener("DOMContentLoaded", inicializarNavegacao);
