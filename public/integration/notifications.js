import { get } from "./connection.js";

// Sistema de notificações em tempo real
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.isPolling = false;
        this.pollInterval = null;
        this.lastCheck = null;
    }

    async inicializar() {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioLogado.id) {
            console.error("Usuário não encontrado para notificações.");
            return;
        }

        this.usuarioId = usuarioLogado.id;
        this.cargo = usuarioLogado.cargo;
        
        // Iniciar polling de notificações
        this.iniciarPolling();
        
        // Carregar notificações existentes
        await this.carregarNotificacoes();
    }

    iniciarPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.pollInterval = setInterval(() => {
            this.verificarNovasNotificacoes();
        }, 30000); // Verificar a cada 30 segundos
    }

    pararPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isPolling = false;
    }

    async verificarNovasNotificacoes() {
        try {
            await this.carregarNotificacoes();
        } catch (error) {
            console.error("Erro ao verificar notificações:", error);
        }
    }

    async carregarNotificacoes() {
        try {
            let notificacoes = [];

            if (this.cargo === 'GERENTE') {
                // Carregar notificações específicas para gerente
                const [solicitacoesHorasExtras, solicitacoesAjustes] = await Promise.allSettled([
                    this.carregarSolicitacoesHorasExtras(),
                    this.carregarSolicitacoesAjustes()
                ]);

                if (solicitacoesHorasExtras.status === 'fulfilled') {
                    notificacoes = notificacoes.concat(solicitacoesHorasExtras.value);
                }

                if (solicitacoesAjustes.status === 'fulfilled') {
                    notificacoes = notificacoes.concat(solicitacoesAjustes.value);
                }
            } else {
                // Carregar notificações para usuário comum
                notificacoes = await this.carregarNotificacoesUsuario();
            }

            this.processarNotificacoes(notificacoes);

        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
        }
    }

    async carregarSolicitacoesHorasExtras() {
        const endpoint = `/horas-extras/solicitacoes-pendentes/gerente/${this.usuarioId}`;
        const solicitacoes = await get(endpoint);
        
        if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
            return [];
        }

        return solicitacoes.map(solicitacao => ({
            id: `horas-extras-${solicitacao.id}`,
            tipo: 'horas-extras',
            titulo: 'Nova Solicitação de Hora Extra',
            mensagem: `Solicitação de hora extra pendente de aprovação`,
            data: solicitacao.data,
            usuario: solicitacao.usuarioId,
            prioridade: 'media',
            acao: 'aprovar-solicitacao',
            dados: solicitacao
        }));
    }

    async carregarSolicitacoesAjustes() {
        const endpoint = `/solicitacoes/gestor/${this.usuarioId}`;
        const solicitacoes = await get(endpoint);
        
        if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
            return [];
        }

        return solicitacoes.map(solicitacao => ({
            id: `ajuste-${solicitacao.id}`,
            tipo: 'ajuste',
            titulo: 'Nova Solicitação de Ajuste',
            mensagem: `Solicitação de ajuste pendente de aprovação`,
            data: solicitacao.data,
            usuario: solicitacao.usuarioId,
            prioridade: 'alta',
            acao: 'aprovar-ajuste',
            dados: solicitacao
        }));
    }

    async carregarNotificacoesUsuario() {
        // Implementar notificações específicas para usuário comum
        const notificacoes = [];

        // Verificar status de solicitações
        try {
            const solicitacoes = await get(`/solicitacoes/${this.usuarioId}`);
            if (Array.isArray(solicitacoes)) {
                solicitacoes.forEach(solicitacao => {
                    if (solicitacao.status === 'APROVADO') {
                        notificacoes.push({
                            id: `aprovado-${solicitacao.id}`,
                            tipo: 'aprovacao',
                            titulo: 'Solicitação Aprovada',
                            mensagem: `Sua solicitação de ${solicitacao.data} foi aprovada`,
                            data: solicitacao.data,
                            prioridade: 'baixa',
                            acao: 'visualizar-solicitacao',
                            dados: solicitacao
                        });
                    } else if (solicitacao.status === 'REJEITADO') {
                        notificacoes.push({
                            id: `rejeitado-${solicitacao.id}`,
                            tipo: 'rejeicao',
                            titulo: 'Solicitação Rejeitada',
                            mensagem: `Sua solicitação de ${solicitacao.data} foi rejeitada`,
                            data: solicitacao.data,
                            prioridade: 'media',
                            acao: 'visualizar-solicitacao',
                            dados: solicitacao
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Erro ao carregar solicitações do usuário:", error);
        }

        return notificacoes;
    }

    processarNotificacoes(notificacoes) {
        const novasNotificacoes = notificacoes.filter(notif => {
            return !this.notifications.find(existing => existing.id === notif.id);
        });

        if (novasNotificacoes.length > 0) {
            this.notifications = [...this.notifications, ...novasNotificacoes];
            this.exibirNotificacoes(novasNotificacoes);
            this.atualizarContador();
        }
    }

    exibirNotificacoes(notificacoes) {
        notificacoes.forEach(notificacao => {
            this.criarNotificacaoToast(notificacao);
        });
    }

    criarNotificacaoToast(notificacao) {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid ${this.getCorPrioridade(notificacao.prioridade)};
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 350px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                        ${notificacao.titulo}
                    </h4>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                        ${notificacao.mensagem}
                    </p>
                    <div style="font-size: 12px; color: #9ca3af;">
                        ${new Date().toLocaleTimeString('pt-BR')}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; color: #9ca3af; cursor: pointer; padding: 0; margin-left: 8px;">
                    ×
                </button>
            </div>
        `;

        // Adicionar estilos CSS se não existirem
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .notification-toast {
                    transition: all 0.3s ease;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    getCorPrioridade(prioridade) {
        const cores = {
            'baixa': '#10b981',
            'media': '#f59e0b',
            'alta': '#ef4444'
        };
        return cores[prioridade] || '#6b7280';
    }

    atualizarContador() {
        const contador = document.querySelector('.notification-count');
        if (contador) {
            const total = this.notifications.length;
            contador.textContent = total > 0 ? total.toString() : '';
            contador.style.display = total > 0 ? 'block' : 'none';
        }
    }

    limparNotificacoes() {
        this.notifications = [];
        this.atualizarContador();
        
        // Remover toasts existentes
        document.querySelectorAll('.notification-toast').forEach(toast => {
            toast.remove();
        });
    }

    obterNotificacoes() {
        return this.notifications;
    }
}

// Instância global do sistema de notificações
const notificationSystem = new NotificationSystem();

// Inicializar quando o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
    notificationSystem.inicializar();
});

// Exportar para uso em outros módulos
export { notificationSystem };
