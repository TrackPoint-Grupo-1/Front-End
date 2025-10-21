import { get, post } from "./connection.js";

document.addEventListener('DOMContentLoaded', async function () {
    const form = document.querySelector('form');
    const dataExtraInput = document.getElementById('dataExtra');
    const horaInicioInput = document.getElementById('horaInicio');
    const horaFimInput = document.getElementById('horaFim');
    const nomeProjetoSelect = document.getElementById('nomeProjeto');
    const justificativaSelect = document.getElementById('justificativa');
    const observacoesTextarea = document.getElementById('observacoes');
    const submitButton = document.querySelector('.my-button');

    // Carregar projetos do usuário logado
    await carregarProjetos();

    // Validação de horários
    function validarHorarios() {
        const inicio = horaInicioInput.value;
        const fim = horaFimInput.value;
        
        if (inicio && fim) {
            const [horaInicio, minutoInicio] = inicio.split(':').map(Number);
            const [horaFim, minutoFim] = fim.split(':').map(Number);
            
            const tempoInicio = horaInicio * 60 + minutoInicio;
            const tempoFim = horaFim * 60 + minutoFim;
            
            if (tempoFim <= tempoInicio) {
                alert('O horário de fim deve ser posterior ao horário de início.');
                return false;
            }
        }
        return true;
    }

    // Adicionar validação em tempo real
    horaInicioInput.addEventListener('change', validarHorarios);
    horaFimInput.addEventListener('change', validarHorarios);

    // Carregar projetos disponíveis
    async function carregarProjetos() {
        try {
            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            if (!usuarioLogado || !usuarioLogado.id) {
                console.error("Usuário não encontrado no localStorage.");
                return;
            }

            const projetos = await get(`/projetos/funcionario/${usuarioLogado.id}?status=ANDAMENTO`);
            
            // Limpar opções existentes (exceto a primeira)
            nomeProjetoSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
            
            if (projetos && projetos.length > 0) {
                projetos.forEach(projeto => {
                    const option = document.createElement('option');
                    option.value = projeto.id;
                    option.textContent = projeto.nome;
                    nomeProjetoSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "Nenhum projeto ativo encontrado";
                option.disabled = true;
                nomeProjetoSelect.appendChild(option);
            }
        } catch (error) {
            console.error("Erro ao carregar projetos:", error);
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Erro ao carregar projetos";
            option.disabled = true;
            nomeProjetoSelect.appendChild(option);
        }
    }

    // Formatação de horário para HH:MM
    function formatarHorario(horario) {
        if (!horario) return '';
        // Se já está no formato HH:MM, retorna
        if (/^\d{2}:\d{2}$/.test(horario)) return horario;
        // Se está no formato H:MM, adiciona zero à esquerda
        if (/^\d{1}:\d{2}$/.test(horario)) return '0' + horario;
        return horario;
    }

    // Validação de formulário
    function validarFormulario() {
        const data = dataExtraInput.value;
        const inicio = formatarHorario(horaInicioInput.value);
        const fim = formatarHorario(horaFimInput.value);
        const projeto = nomeProjetoSelect.value;
        const justificativa = justificativaSelect.value;
        const observacoes = observacoesTextarea.value.trim();

        if (!data) {
            alert('Por favor, selecione a data da hora extra.');
            return false;
        }

        if (!inicio || !fim) {
            alert('Por favor, preencha os horários de início e fim.');
            return false;
        }

        if (!validarHorarios()) {
            return false;
        }

        if (!projeto) {
            alert('Por favor, selecione um projeto.');
            return false;
        }

        if (!justificativa) {
            alert('Por favor, selecione uma justificativa.');
            return false;
        }

        return true;
    }

    // Envio do formulário
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado || !usuarioLogado.id) {
            alert('Usuário não encontrado. Faça login novamente.');
            return;
        }

        // Desabilitar botão e mostrar loading
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Enviando...';
        submitButton.disabled = true;

        try {
            // Converter data para formato yyyy-MM-dd
            const dataFormatada = dataExtraInput.value;
            
            // Converter horários para formato HH:mm
            const inicio = formatarHorario(horaInicioInput.value);
            const fim = formatarHorario(horaFimInput.value);

            const payload = {
                data: dataFormatada,
                horasDe: inicio,
                horasAte: fim,
                projeto: parseInt(nomeProjetoSelect.value),
                justificativa: justificativaSelect.value,
                observacao: observacoesTextarea.value.trim() || null,
                usuarioId: usuarioLogado.id
            };

            console.log('Enviando solicitação:', payload);

            await post('/horas-extras', payload);

            alert('Solicitação de hora extra enviada com sucesso!');
            form.reset();
            
            // Recarregar projetos
            await carregarProjetos();

        } catch (error) {
            console.error('Erro ao enviar solicitação:', error);
            
            let mensagemErro = 'Erro ao enviar solicitação. Tente novamente.';
            
            if (error.message) {
                // Tentar extrair mensagem de erro do backend
                try {
                    const match = error.message.match(/\{.*\}/);
                    if (match) {
                        const errorData = JSON.parse(match[0]);
                        mensagemErro = errorData.mensagem || errorData.message || mensagemErro;
                    }
                } catch (parseError) {
                    // Se não conseguir fazer parse, usar mensagem padrão
                }
            }
            
            alert(mensagemErro);
        } finally {
            // Reabilitar botão
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });

    // Formatação automática de horários
    horaInicioInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + ':' + value.substring(2, 4);
        }
        e.target.value = value;
    });

    horaFimInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + ':' + value.substring(2, 4);
        }
        e.target.value = value;
    });
});
