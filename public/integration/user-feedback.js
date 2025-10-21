// Sistema de feedback e validações para melhorar UX
class UserFeedbackSystem {
    constructor() {
        this.toastContainer = null;
        this.criarContainerToast();
    }

    criarContainerToast() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(this.toastContainer);
    }

    mostrarToast(mensagem, tipo = 'info', duracao = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        
        const cores = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };

        const icones = {
            'success': '✓',
            'error': '✕',
            'warning': '⚠',
            'info': 'ℹ'
        };

        toast.style.cssText = `
            background: white;
            border-left: 4px solid ${cores[tipo]};
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 350px;
            animation: slideInRight 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        toast.innerHTML = `
            <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: ${cores[tipo]};
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
                flex-shrink: 0;
            ">${icones[tipo]}</div>
            <div style="flex: 1; font-size: 14px; color: #374151;">${mensagem}</div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                margin-left: 8px;
            ">×</button>
        `;

        this.toastContainer.appendChild(toast);

        // Remover automaticamente
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, duracao);
    }

    mostrarSucesso(mensagem) {
        this.mostrarToast(mensagem, 'success');
    }

    mostrarErro(mensagem) {
        this.mostrarToast(mensagem, 'error', 7000);
    }

    mostrarAviso(mensagem) {
        this.mostrarToast(mensagem, 'warning');
    }

    mostrarInfo(mensagem) {
        this.mostrarToast(mensagem, 'info');
    }

    mostrarLoading(mensagem = 'Carregando...') {
        const loadingToast = document.createElement('div');
        loadingToast.id = 'loading-toast';
        loadingToast.style.cssText = `
            background: white;
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 350px;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        loadingToast.innerHTML = `
            <div style="
                width: 24px;
                height: 24px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <div style="font-size: 14px; color: #374151;">${mensagem}</div>
        `;

        this.toastContainer.appendChild(loadingToast);
        return loadingToast;
    }

    esconderLoading() {
        const loadingToast = document.getElementById('loading-toast');
        if (loadingToast) {
            loadingToast.remove();
        }
    }
}

// Sistema de validação de formulários
class FormValidator {
    static validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static validarData(data) {
        const regex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regex.test(data)) return false;
        
        const [dia, mes, ano] = data.split('/').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        
        return dataObj.getDate() === dia && 
               dataObj.getMonth() === mes - 1 && 
               dataObj.getFullYear() === ano;
    }

    static validarHorario(horario) {
        const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(horario);
    }

    static validarFormulario(formulario) {
        const erros = [];
        const campos = formulario.querySelectorAll('input[required], select[required], textarea[required]');
        
        campos.forEach(campo => {
            const valor = campo.value.trim();
            const nome = campo.getAttribute('name') || campo.id;
            
            if (!valor) {
                erros.push(`${nome} é obrigatório`);
                this.marcarCampoErro(campo);
            } else {
                this.removerCampoErro(campo);
                
                // Validações específicas
                if (campo.type === 'email' && !this.validarEmail(valor)) {
                    erros.push(`${nome} deve ser um email válido`);
                    this.marcarCampoErro(campo);
                }
                
                if (campo.type === 'date' && !this.validarData(valor)) {
                    erros.push(`${nome} deve ser uma data válida`);
                    this.marcarCampoErro(campo);
                }
                
                if (campo.type === 'time' && !this.validarHorario(valor)) {
                    erros.push(`${nome} deve ser um horário válido`);
                    this.marcarCampoErro(campo);
                }
            }
        });
        
        return {
            valido: erros.length === 0,
            erros: erros
        };
    }

    static marcarCampoErro(campo) {
        campo.style.borderColor = '#ef4444';
        campo.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
    }

    static removerCampoErro(campo) {
        campo.style.borderColor = '';
        campo.style.boxShadow = '';
    }
}

// Sistema de confirmação de ações
class ConfirmationSystem {
    static confirmar(mensagem, titulo = 'Confirmar') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                ">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">${titulo}</h3>
                    <p style="margin: 0 0 24px 0; color: #6b7280; line-height: 1.5;">${mensagem}</p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="cancel-btn" style="
                            background: #f3f4f6;
                            border: 1px solid #d1d5db;
                            color: #374151;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Cancelar</button>
                        <button id="confirm-btn" style="
                            background: #ef4444;
                            border: 1px solid #ef4444;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Confirmar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cancelBtn = modal.querySelector('#cancel-btn');
            const confirmBtn = modal.querySelector('#confirm-btn');

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }
}

// Instâncias globais
const feedbackSystem = new UserFeedbackSystem();

// Adicionar estilos CSS
const styles = document.createElement('style');
styles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styles);

// Exportar para uso global
window.feedbackSystem = feedbackSystem;
window.FormValidator = FormValidator;
window.ConfirmationSystem = ConfirmationSystem;

// Funções de conveniência
window.mostrarSucesso = (mensagem) => feedbackSystem.mostrarSucesso(mensagem);
window.mostrarErro = (mensagem) => feedbackSystem.mostrarErro(mensagem);
window.mostrarAviso = (mensagem) => feedbackSystem.mostrarAviso(mensagem);
window.mostrarInfo = (mensagem) => feedbackSystem.mostrarInfo(mensagem);
window.mostrarLoading = (mensagem) => feedbackSystem.mostrarLoading(mensagem);
window.esconderLoading = () => feedbackSystem.esconderLoading();
