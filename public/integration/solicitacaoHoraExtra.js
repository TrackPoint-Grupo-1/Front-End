import { post, get } from "./connection.js";

(function () {
    // nomes/ids esperados
    const FIELD_NAMES = [
        'usuarioId',
        'projeto',
        'data',
        'horasDe',
        'horasAte',
        'justificativa',
        'observacao'
    ];

    function getInputValue(name) {
        let el = document.querySelector(`#${name}`) || document.querySelector(`[name="${name}"]`);
        if (!el) return null;
        // para selects/inputs normalizados
        return el.value != null ? el.value.trim() : null;
    }

    // ---------- ADIÇÃO: ler usuarioId do localStorage ----------
    function getUsuarioIdFromLocalStorage() {
        try {
            const raw = localStorage.getItem('usuarioLogado');
            if (!raw) return null;
            const obj = JSON.parse(raw);
            // espera-se objeto com .id; aceitar alternativas por segurança
            const id = obj && (obj.id ?? obj.usuarioId ?? obj.userId);
            return id != null ? Number(id) : null;
        } catch (e) {
            console.warn('Falha ao ler usuarioLogado do localStorage', e);
            return null;
        }
    }
    // ---------- FIM DA ADIÇÃO ----------

    // ---------- ADIÇÃO: buscar e popular projetos do usuário ----------
    async function fetchProjectsForUser(usuarioId) {
        if (!usuarioId) return null;
        try {
            const res = await get(`/projetos/funcionario/${usuarioId}?status=ANDAMENTO`);
            // se retornou Response (fetch)
            if (res instanceof Response) {
                if (!res.ok) throw res;
                const json = await res.json().catch(() => null);
                return Array.isArray(json) ? json : null;
            }
            // se retornou já um objeto/array
            if (Array.isArray(res)) return res;
            // caso seja objeto com data
            if (res && Array.isArray(res.data)) return res.data;
            return null;
        } catch (err) {
            const msg = await extractBackendMessage(err);
            console.error('Erro ao buscar projetos do usuário:', msg, err);
            return null;
        }
    }

    function ensureProjectSelect() {
        // procura um select existente; se houver input, substitui invisivelmente com select
        let sel = document.querySelector('#projeto[name="projeto"]') || document.querySelector('#projeto') || document.querySelector('[name="projeto"]');
        // se o elemento encontrado não for <select>, cria um select e insere após ele
        if (sel && sel.tagName && sel.tagName.toLowerCase() !== 'select') {
            const input = sel;
            const select = document.createElement('select');
            select.id = 'projeto';
            select.name = 'projeto';
            // manter valor anterior se existia
            if (input.value) {
                const opt = document.createElement('option');
                opt.value = input.value;
                opt.textContent = input.value;
                select.appendChild(opt);
            }
            input.style.display = 'none';
            input.parentNode.insertBefore(select, input.nextSibling);
            return select;
        }
        // se não existe nada, tenta encontrar form e anexar select
        if (!sel) {
            const form = findForm();
            const select = document.createElement('select');
            select.id = 'projeto';
            select.name = 'projeto';
            select.innerHTML = '<option value="">Carregando projetos...</option>';
            if (form) {
                // inserir antes do botão submit
                const ref = form.querySelector('#submitSolicitacaoHoraExtra') || form.querySelector('button, input[type="submit"]');
                form.insertBefore(select, ref || null);
            } else {
                document.body.appendChild(select);
            }
            return select;
        }
        // se já for select, retorná-lo
        if (sel.tagName && sel.tagName.toLowerCase() === 'select') return sel;
        // fallback: criar select
        const select = document.createElement('select');
        select.id = 'projeto';
        select.name = 'projeto';
        (document.body).appendChild(select);
        return select;
    }

    function populateProjectSelect(select, projects) {
        select.innerHTML = '';
        if (!Array.isArray(projects) || projects.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Nenhum projeto em andamento';
            select.appendChild(opt);
            return;
        }
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Selecione um projeto';
        select.appendChild(placeholder);
        for (const p of projects) {
            const opt = document.createElement('option');
            opt.value = String(p.id);
            opt.textContent = p.nome || (`Projeto ${p.id}`);
            select.appendChild(opt);
        }
    }

    // ---------- FIM DA ADIÇÃO ----------

    function findForm() {
        return document.querySelector('#solicitacaoHoraExtraForm') ||
            document.querySelector('form[name="solicitacaoHoraExtra"]') ||
            document.querySelector('form[data-role="solicitacaoHoraExtra"]') ||
            null;
    }

    function ensureSubmitButton(form) {
        let btn = form.querySelector('#submitSolicitacaoHoraExtra') || form.querySelector('button[type="submit"], input[type="submit"]');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'submitSolicitacaoHoraExtra';
            btn.textContent = 'Enviar Solicitação de Hora Extra';
            // tenta adicionar ao final do form
            form.appendChild(btn);
        }
        return btn;
    }

    // tenta extrair mensagem legível do backend a partir de várias formas de resposta/erro
    async function extractBackendMessage(obj) {
        if (!obj) return null;

        // caso seja Response (fetch)
        if (obj instanceof Response) {
            try {
                const json = await obj.clone().json().catch(() => null);
                if (json) return json.message ?? json.error ?? JSON.stringify(json);
            } catch (e) { /* ignore */ }
            try {
                const text = await obj.clone().text().catch(() => null);
                if (text) return text;
            } catch (e) { /* ignore */ }
            return `Status ${obj.status}`;
        }

        // axios-style error (err.response)
        if (obj.response) {
            const data = obj.response.data;
            if (data) return data.message ?? data.error ?? JSON.stringify(data);
            return obj.response.statusText || `Status ${obj.response.status}`;
        }

        // objeto JSON retornado diretamente
        if (typeof obj === 'object') {
            return obj.message ?? obj.error ?? JSON.stringify(obj);
        }

        // string simples
        if (typeof obj === 'string') return obj;

        // fallback
        return String(obj);
    }

    // substituir submitPayload para usar post('/horas-extras', payload)
    async function submitPayload(payload, submitButton) {
        submitButton.disabled = true;
        try {
            // Normalizar payload para o formato que o backend espera
            function formatDateToDDMMYYYY(d) {
                if (!d) return '';
                // já no formato dd/mm/yyyy?
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
                // formato ISO yyyy-mm-dd
                const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (m) return `${m[3]}/${m[2]}/${m[1]}`;
                // tenta parse de Date
                const dt = new Date(d);
                if (!isNaN(dt.getTime())) {
                    const dd = String(dt.getDate()).padStart(2, '0');
                    const mm = String(dt.getMonth() + 1).padStart(2, '0');
                    const yyyy = dt.getFullYear();
                    return `${dd}/${mm}/${yyyy}`;
                }
                return d; // fallback: enviar como veio
            }

            const normalized = {
                usuarioId: Number(payload.usuarioId),
                projeto: Number(payload.projeto ?? payload.projetoId ?? payload.projeto_id ?? payload.projetoId),
                data: formatDateToDDMMYYYY(payload.data ?? payload.dataExtra ?? payload.dataSolicitacao),
                horasDe: payload.horasDe ?? payload.horaInicio ?? payload.hora_de ?? payload.horaInicio,
                horasAte: payload.horasAte ?? payload.horaFim ?? payload.hora_ate ?? payload.horaFim,
                justificativa: payload.justificativa || '',
                observacao: payload.observacao || payload.observacoes || ''
            };

            console.log('Enviar payload horas-extras (normalizado):', normalized);

            // envia no formato esperado
            const res = await post('/horas-extras', normalized);

            // se post retornar um Response do fetch
            if (res instanceof Response) {
                if (res.ok) {
                    alert('Solicitação enviada com sucesso.');
                } else {
                    const msg = await extractBackendMessage(res);
                    alert(msg || 'Falha ao enviar solicitação. (sem mensagem do backend)');
                    console.error('Resposta do servidor:', res.status, msg);
                }
                return;
            }

            // se post retornar um objeto JSON (sucesso/erro)
            if (res && (res.error || res.success === false)) {
                const msg = await extractBackendMessage(res);
                alert(msg || 'Falha ao enviar solicitação. Veja console para detalhes.');
                console.error('Erro do servidor:', res);
            } else {
                // sucesso presumido
                alert('Solicitação enviada com sucesso.');
            }
        } catch (err) {
            const msg = await extractBackendMessage(err);
            console.error('Erro ao enviar solicitação:', err);
            alert((msg ? msg + '\n' : '') + 'Erro ao enviar solicitação. Veja console para payload e detalhes.');
        } finally {
            submitButton.disabled = false;
        }
    }

    function attachHandlerToForm(form) {
        const submitButton = ensureSubmitButton(form);

        submitButton.addEventListener('click', function (e) {
            e.preventDefault();
            // coletar valores
            const values = {};
            for (const name of FIELD_NAMES) {
                values[name] = getInputValue(name);
            }

            // ---------- USAR usuarioId do localStorage quando existir ----------
            const localId = getUsuarioIdFromLocalStorage();
            if (localId) {
                values.usuarioId = String(localId); // manter como string para validação unificada
            }
            // ---------- FIM ----------

            // validação mínima
            if (!values.usuarioId || !values.projeto || !values.data || !values.horasDe || !values.horasAte || !values.justificativa || !values.observacao) {
                alert('Preencha os campos: projeto, data, horasDe, horasAte, justificativa e observacao.');
                return;
            }
            // converter números se necessário
            const payload = {
                usuarioId: Number(values.usuarioId),
                projeto: Number(values.projeto),
                data: values.data,
                horasDe: values.horasDe,
                horasAte: values.horasAte,
                justificativa: values.justificativa,
                observacao: values.observacao
            };
            submitPayload(payload, submitButton);
        });
    }

    function attachHandlerToStandaloneInputs(container) {
        // criar botão em container se não houver form
        let btn = document.querySelector('#submitSolicitacaoHoraExtraStandalone');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'submitSolicitacaoHoraExtraStandalone';
            btn.type = 'button';
            btn.textContent = 'Enviar Solicitação de Hora Extra';
            (container || document.body).appendChild(btn);
        }
        btn.addEventListener('click', function () {
            const values = {};
            for (const name of FIELD_NAMES) {
                values[name] = getInputValue(name);
            }

            // ---------- USAR usuarioId do localStorage quando existir ----------
            const localId = getUsuarioIdFromLocalStorage();
            if (localId) {
                values.usuarioId = String(localId);
            }
            // ---------- FIM ----------

            if (!values.usuarioId || !values.projeto || !values.data || !values.horasDe || !values.horasAte) {
                alert('Preencha os campos: usuarioId, projeto, data, horasDe e horasAte.');
                return;
            }
            const payload = {
                usuarioId: Number(values.usuarioId),
                projeto: Number(values.projeto),
                data: values.data,
                horasDe: values.horasDe,
                horasAte: values.horasAte,
                justificativa: values.justificativa || '',
                observacao: values.observacao || ''
            };
            submitPayload(payload, btn);
        });
    }

    document.addEventListener('DOMContentLoaded', async function () {
        // carregar projetos do usuário e popular select antes de anexar handlers
        const localId = getUsuarioIdFromLocalStorage();
        if (localId) {
            const projects = await fetchProjectsForUser(localId);
            const select = ensureProjectSelect();
            if (select) {
                populateProjectSelect(select, projects);
            }
        }

        const form = findForm();
        if (form) {
            attachHandlerToForm(form);
            return;
        }
        // se não houver form, verificar se há inputs soltos na página
        const foundAnyInput = FIELD_NAMES.some(name => document.querySelector(`#${name}`) || document.querySelector(`[name="${name}"]`));
        if (foundAnyInput) {
            attachHandlerToStandaloneInputs();
        } else {
            // não encontrou elementos esperados — registrar para debug
            console.warn('solicitacaoHoraExtra: nenhum form/inputs encontrados. Espere que a página tenha elementos com ids/names:', FIELD_NAMES);
        }
    });
})();