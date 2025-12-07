// relatorio.js
import { get, patch, post } from "./connection.js";

// --------------------------------------------
// Variáveis principais
// --------------------------------------------
let usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));

// Debug: verificar o que está no localStorage
console.log('Usuário logado:', usuarioLogado);

// Verificação de usuário será feita no DOMContentLoaded

let currentTab = 'hours';
let selectedDate = '';
let addedRows = 0;

const addHoursBtn = document.querySelector('#hours-report .add-btn');
const addProjectBtn = document.querySelector('#projects-report .add-btn');

const projectsTableBody = document.getElementById('projects-table-body');
const projectsError = document.getElementById('projects-error');

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o usuário está logado
    if (!usuarioLogado || !usuarioLogado.id) {
        console.warn('Usuário não logado. Redirecionando para login...');
        window.location.href = '/login';
        return;
    }
    
    document.getElementById('search-btn').addEventListener('click', searchReports);
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportPontosEntreDatas);

    // Eventos das abas
    document.getElementById('hours-tab').addEventListener('click', () => switchTab('hours'));
    document.getElementById('projects-tab').addEventListener('click', () => switchTab('projects'));

    // Evento "+" de projetos
    addProjectBtn.addEventListener('click', addProjectEntry);

    // Inicializa data atual
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`; // dd/mm/aaaa (formato interno)
    setDateInputValue(document.getElementById('date-input'), formattedDate);
    selectedDate = formattedDate;
    
    console.log('Data inicial definida:', selectedDate);

    // Carrega dados iniciais
    loadReportData();
});

// --------------------------------------------
// Funções de abas
// --------------------------------------------
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tab + '-tab').classList.add('active');
    currentTab = tab;
    loadReportData();
}

// --------------------------------------------
// Funções de busca e carregamento
// --------------------------------------------
async function searchReports() {
    const dateInput = document.getElementById('date-input');
    selectedDate = readDateInputValue(dateInput); // sempre retorna dd/mm/aaaa
    console.log('Data selecionada:', selectedDate);
    
    if (!selectedDate) {
        showNoDateMessage();
        return;
    }
    await loadReportData();
}

async function loadReportData() {
    hideNoDateMessage();
    if (!selectedDate) return;

    if (currentTab === 'hours') {
        await loadHoursData();
        document.getElementById('projects-report').classList.add('hidden');
        document.getElementById('hours-report').classList.remove('hidden');
    } else if (currentTab === 'projects') {
        await loadProjectsData();
        document.getElementById('hours-report').classList.add('hidden');
        document.getElementById('projects-report').classList.remove('hidden');
    }
}

// --------------------------------------------
// Funções de mensagens
// --------------------------------------------
function showNoDateMessage() {
    document.querySelectorAll('.report-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('no-date-message').classList.remove('hidden');
}
function hideNoDateMessage() {
    document.getElementById('no-date-message').classList.add('hidden');
}

// --------------------------------------------
// Relatório de horas
// --------------------------------------------
const tiposManuais = ["ENTRADA", "ALMOCO", "VOLTA_ALMOCO", "SAIDA"];
addHoursBtn.addEventListener('click', async () => {
    if (!selectedDate) { showNoDateMessage(); return; }

    try {
        // calcula primeiro e último dia do mês da data selecionada (formato dd/mm/yyyy)
        const [dia, mes, ano] = selectedDate.split('/');
        const firstDay = `01/${mes}/${ano}`;
        const lastDayNum = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).getDate();
        const lastDay = `${String(lastDayNum).padStart(2, '0')}/${mes}/${ano}`;

        const encodedInicio = encodeURIComponent(firstDay);
        const encodedFim = encodeURIComponent(lastDay);

        const solicitacoes = await get(
            `/solicitacoes/${usuarioLogado.id}`,
            { "User-Agent": "trackpoint-frontend" }
        );

        // converte selectedDate para yyyy-mm-dd para comparar com os itens retornados
        const isoSelected = `${ano}-${mes}-${dia}`;

        const match = Array.isArray(solicitacoes)
            ? solicitacoes.find(s => {
                const sData = s.data || s.dataSolicitacao || '';
                return sData === isoSelected;
            })
            : null;

        if (!match) {
            alert('Não é possível adicionar horas: não existe solicitação para a data selecionada.');
            return;
        }

        const status = String(match.status || '').toUpperCase();

        if (status === 'APROVADO') {
            addHoursEntry();
            return;
        }

        if (status === 'PENDENTE') {
            alert('Existe uma solicitação PENDENTE para esta data. Porém, ela ainda não foi aprovada pelo seu gestor.');
        }

        alert('Não é possível adicionar horas: não existe solicitação aprovada para a data selecionada.');
    } catch (err) {
        console.error(err);
        alert('Erro ao verificar solicitações. Tente novamente.');
    }
});

async function loadHoursData() {
    const tableBody = document.getElementById('hours-table-body');
    tableBody.innerHTML = '';

    const controlarBotaoAdicionar = (dataEncontrada) => {
        if (!selectedDate) { addHoursBtn.style.display = "none"; return; }
        if (!dataEncontrada) { addHoursBtn.style.display = "flex"; return; }

        const tiposExistentes = Array.from(tableBody.querySelectorAll("tr td:nth-child(2)"))
            .map(td => td.textContent.trim());
        const temTodosTipos = tiposManuais.every(t => tiposExistentes.includes(t));

        if (tiposExistentes.length === 0 || !temTodosTipos) addHoursBtn.style.display = "flex";
        else addHoursBtn.style.display = "none";
    };

    try {
        if (!selectedDate) return;

        const encodedDate = encodeURIComponent(selectedDate);
        console.log('Buscando pontos para usuário:', usuarioLogado.id, 'data:', selectedDate);
        const data = await get(`/pontos/${usuarioLogado.id}?data=${encodedDate}`, { "User-Agent": "trackpoint-frontend" });
        console.log('Dados retornados:', data);

        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                        <div style="margin-bottom: 10px;">📅 Nenhum ponto registrado para ${selectedDate}</div>
                        <div style="font-size: 12px; color: #999; margin-bottom: 15px;">
                            Para registrar pontos, use a página "Bater Ponto" ou clique no botão "Adicionar" abaixo.
                        </div>
                        <button onclick="criarPontosTeste()" style="
                            background: #008781; 
                            color: white; 
                            border: none; 
                            padding: 8px 16px; 
                            border-radius: 4px; 
                            cursor: pointer; 
                            font-size: 12px;
                        ">
                            🧪 Criar Pontos de Teste
                        </button>
                    </td>
                </tr>
            `;
            controlarBotaoAdicionar(true); // Permite adicionar pontos mesmo quando não há dados
        } else {
            data.forEach(entry => {
                const horario = new Date(entry.horario);
                const horaLocal = horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" });
                const isAutomatico = entry.manual === false;
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${isAutomatico ? "Marcação de Ponto" : "Marcação de Ponto Manual"}</td>
                    <td>${entry.tipo}</td>
                    <td>${horaLocal}</td>
                    <td>${entry.observacoes || '-'}</td>
                    <td>${isAutomatico ? '-' : '<button class="edit-btn">-</button>'}</td>
                `;
                tableBody.appendChild(row);
            });
            controlarBotaoAdicionar(true);
        }

        // Horas extras
        const [dia, mes, ano] = selectedDate.split('/');
        const encodedInicio = encodeURIComponent(`${dia}/${mes}/${ano}`);
        const encodedFim = encodeURIComponent(`${dia}/${mes}/${ano}`);
        
        let totalHoras = 0;
        let extrasData = null;
        try {
            extrasData = await get(
                `/horas-extras/listar-horas/${usuarioLogado.id}?dataInicio=${encodedInicio}&dataFim=${encodedFim}`,
                { "User-Agent": "trackpoint-frontend" }
            );
            totalHoras = extrasData.horasTotal?.totalHoras || 0;
        } catch (error) {
            if (error.message.includes('404')) {
                console.log('Nenhuma hora extra encontrada para esta data');
                totalHoras = 0;
            } else {
                console.error('Erro ao buscar horas extras:', error);
                totalHoras = 0;
            }
        }
        if (totalHoras > 0 && extrasData) {
            const horas = Math.floor(totalHoras);
            const minutos = Math.round((totalHoras - horas) * 60);
            const horaExtraFormatada = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
            const justificativa = extrasData.listaHoras?.[0]?.justificativa || "Hora extra não justificada";
            const horaExtraId = extrasData.listaHoras?.[0]?.id;

            const row = document.createElement("tr");
            row.innerHTML = `
        <td>Hora Extra</td>
        <td>-</td>
        <td>${horaExtraFormatada}</td>
        <td class="justificativa-cell" style="cursor:pointer;color:#1e90ff;text-decoration:underline;">${justificativa}</td>
        <td class="projeto-cell" style="cursor:pointer;color:#1e90ff;text-decoration:underline;"></td>
    `;
            tableBody.appendChild(row);

            // --- Justificativa ---
            const justificativaCell = row.querySelector('.justificativa-cell');
            justificativaCell.addEventListener('click', () => {
                if (justificativaCell.querySelector('select')) return;

                const select = document.createElement('select');
                select.innerHTML = `
            <option value="">⚙️ Selecione uma justificativa</option>
            <option value="Cumprimento de Prazo Crítico">Cumprimento de Prazo Crítico</option>
            <option value="Imprevisto/Ocorrencia Urgente">Imprevisto/Ocorrencia Urgente</option>
            <option value="Demanda Excepcional">Demanda Excepcional</option>
        `;
                justificativaCell.innerHTML = '';
                justificativaCell.appendChild(select);
                select.focus();

                select.addEventListener('change', async () => {
                    const novaJustificativa = select.value;
                    if (!novaJustificativa) return;
                    try {
                        await patch(`/horas-extras/${horaExtraId}`,
                            { justificativa: novaJustificativa },
                            { "User-Agent": "trackpoint-frontend" }
                        );
                        justificativaCell.textContent = novaJustificativa;
                    } catch (e) {
                        justificativaCell.textContent = '-';
                        alert("Erro ao atualizar justificativa.");
                    }
                });

                select.addEventListener('blur', () => {
                    if (!select.value) justificativaCell.textContent = justificativa;
                });
            });

            // Buscar projetos do usuário
            const projetosOpcoes = await get(`/projetos/funcionario/${usuarioLogado.id}?status=ANDAMENTO`, { "User-Agent": "trackpoint-frontend" });

            // Depois de criar a linha da tabela, adicionar o click para edição do projeto
            const projetoCell = row.querySelector('.projeto-cell');
            const codigoProjeto = extrasData.listaHoras?.[0]?.codigoProjeto;

            // Preencher inicialmente o nome do projeto
            if (codigoProjeto) {
                try {
                    const projetoData = await get(`/projetos/${codigoProjeto}`, { "User-Agent": "trackpoint-frontend" });
                    projetoCell.textContent = projetoData.nome || "Projeto não selecionado";
                } catch (e) {
                    projetoCell.textContent = "Projeto não selecionado";
                }
            } else {
                projetoCell.textContent = "Projeto não selecionado";
            }

            // Evento click para abrir o select
            projetoCell.addEventListener('click', () => {
                if (projetoCell.querySelector('select')) return;

                const select = document.createElement('select');
                select.innerHTML = `<option value="">Projeto não selecionado</option>` +
                    projetosOpcoes.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');

                select.value = codigoProjeto || "";
                projetoCell.innerHTML = '';
                projetoCell.appendChild(select);
                select.focus();

                select.addEventListener('change', async () => {
                    const projetoId = select.value;
                    if (!projetoId) return;
                    try {
                        await patch(`/horas-extras/${horaExtraId}`, { projeto: parseInt(projetoId) }, { "User-Agent": "trackpoint-frontend" });
                        const projetoSelecionado = projetosOpcoes.find(p => p.id == projetoId)?.nome || "Projeto não selecionado";
                        projetoCell.textContent = projetoSelecionado;
                    } catch (e) {
                        alert("Erro ao atualizar projeto.");
                        projetoCell.textContent = projetosOpcoes.find(p => p.id == codigoProjeto)?.nome || "Projeto não selecionado";
                    }
                });

                select.addEventListener('blur', () => {
                    if (!select.value) {
                        projetoCell.textContent = projetosOpcoes.find(p => p.id == codigoProjeto)?.nome || "Projeto não selecionado";
                    }
                });
            });

        }


    } catch (err) { console.error(err); tableBody.innerHTML = `<tr><td colspan="5">Pontos não encontrados para a data selecionada</td></tr>`; controlarBotaoAdicionar(false); }
}

function addHoursEntry() {
    const tableBody = document.getElementById('hours-table-body');
    if (addedRows >= tiposManuais.length) return;

    const tipo = tiposManuais[addedRows];
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>Marcação de Ponto Manual</td>
        <td>${tipo}</td>
        <td><input type="time" class="hora-input" /></td>
        <td>
            <select class="justificativa-select">
                <option value="">⚙️ Selecione uma justificativa</option>
                <option value="Cumprimento de Prazo Crítico">Cumprimento de Prazo Crítico</option>
                <option value="Imprevisto/Ocorrencia Urgente">Imprevisto/Ocorrencia Urgente</option>
                <option value="Demanda Excepcional">Demanda Excepcional</option>
                <option value="Reunião/Compromisso">Reunião/Compromisso</option>
            </select>
        </td>
        <td>-</td>
    `;
    tableBody.appendChild(row);
    addedRows++;

    ensureSaveHoursButton();
}

// Cria/exibe o botão de salvar para marcações manuais e registra o handler
function ensureSaveHoursButton() {
    const container = document.getElementById('hours-report');
    if (!container) return;

    let saveBtn = container.querySelector('#save-hours-btn');
    if (!saveBtn) {
        saveBtn = document.createElement('button');
        saveBtn.id = 'save-hours-btn';
        saveBtn.textContent = 'Salvar Pontos Manuais';
        saveBtn.style.marginTop = '12px';
        saveBtn.style.background = '#008781';
        saveBtn.style.color = '#fff';
        saveBtn.style.border = 'none';
        saveBtn.style.padding = '8px 12px';
        saveBtn.style.borderRadius = '4px';
        saveBtn.style.cursor = 'pointer';

        // por padrão posiciona abaixo da tabela de horas
        const tableEl = container.querySelector('table');
        if (tableEl && tableEl.parentElement) {
            tableEl.parentElement.appendChild(saveBtn);
        } else {
            container.appendChild(saveBtn);
        }

        saveBtn.addEventListener('click', saveManualHours);
    }

    // mostra se houver pelo menos uma linha manual em edição
    const hasManualInputs = !!document.querySelector('#hours-table-body .hora-input');
    saveBtn.style.display = hasManualInputs ? 'inline-flex' : 'none';
}

async function saveManualHours() {
    try {
        if (!usuarioLogado || !usuarioLogado.id) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = '/login';
            return;
        }

        if (!selectedDate) {
            alert('Selecione uma data para salvar.');
            return;
        }

        const rows = Array.from(document.querySelectorAll('#hours-table-body tr'));
        const manualRows = rows.filter(r => r.querySelector('.hora-input'));
        if (manualRows.length === 0) {
            alert('Não há pontos manuais para salvar.');
            return;
        }

        const [dia, mes, ano] = selectedDate.split('/');
        const dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;

        // valida e prepara payloads
        const payloads = [];
        for (const r of manualRows) {
            const tipo = r.children[1]?.textContent?.trim() || '';
            const horaVal = r.querySelector('.hora-input')?.value || '';
            const justificativa = r.querySelector('.justificativa-select')?.value || '';

            if (!horaVal) {
                alert(`Informe a hora para ${tipo}.`);
                return;
            }
            if (!justificativa) {
                alert(`Selecione a justificativa para ${tipo}.`);
                return;
            }

            // horaVal formato HH:MM
            const horario = `${dataISO}T${horaVal}:00`;
            payloads.push({
                tipo,
                horario,
                observacoes: justificativa,
                manual: true
            });
        }

        // envia em série para manter simplicidade e mensagens claras
        for (const p of payloads) {
            // backend pode esperar POST em /pontos com usuarioId no corpo
            await post(`/pontos`, { ...p, usuarioId: usuarioLogado.id });
        }

        alert('Pontos manuais salvos com sucesso!');

        // reseta estado e recarrega dados
        addedRows = 0;
        await loadHoursData();
        ensureSaveHoursButton();
    } catch (error) {
        console.error('Erro ao salvar pontos manuais:', error);
        try {
            // tenta extrair mensagem
            let mensagem = null;
            if (typeof error === 'string') {
                const match = error.match(/{.*}/s);
                if (match) mensagem = JSON.parse(match[0]).mensagem;
            } else if (error?.message && error.message.includes('{')) {
                const match = error.message.match(/{.*}/s);
                if (match) mensagem = JSON.parse(match[0]).mensagem;
            } else if (error?.mensagem) {
                mensagem = error.mensagem;
            }
            alert(mensagem || 'Erro ao salvar pontos manuais.');
        } catch {
            alert('Erro ao salvar pontos manuais.');
        }
    }
}

// --------------------------------------------
// Relatório de Projetos
// --------------------------------------------
async function loadProjectsData() {
    if (!selectedDate) return;
    
    console.log('Carregando dados de projetos para data:', selectedDate);

    // Primeiro carrega os projetos disponíveis
    await fetchUserProjects(selectedDate);

    // Depois busca os apontamentos feitos
    await fetchUserApontamentos(selectedDate);
}


async function fetchUserProjects(date) {
    try {
        const encodedDate = encodeURIComponent(date);
        const userId = usuarioLogado.id;

        const projects = await get(`/projetos/funcionario/${userId}?status=ANDAMENTO`, { "User-Agent": "trackpoint-frontend" });
        projectsTableBody.dataset.projects = JSON.stringify(projects);
        projectsTableBody.innerHTML = '';

        if (!projects || projects.length === 0) {
            projectsTableBody.innerHTML = `<tr><td colspan="5">Nenhum projeto encontrado para esta data.</td></tr>`;
            projectsError.classList.add('hidden');
            addProjectBtn.style.display = 'flex';
            return;
        }

        projects.forEach(proj => {
            // Se quiser mostrar projetos existentes, pode colocar aqui
        });

        addProjectBtn.style.display = 'flex';
        projectsError.classList.add('hidden');

    } catch (err) {
        console.error(err);
        projectsTableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar projetos.</td></tr>`;
        addProjectBtn.style.display = 'none';
        projectsError.classList.add('hidden');
    }
}

// --------------------------------------------
// Adicionar linha de projeto
// --------------------------------------------
function addProjectEntry() {
    const row = document.createElement('tr');
    const projects = JSON.parse(projectsTableBody.dataset.projects || '[]');

    const actionSelect = `<select class="project-action">
        <option value="">Selecione a ação</option>
        <option value="Desenvolvimento">Desenvolvimento</option>
        <option value="Reunião">Reunião</option>
        <option value="Treinamento">Treinamento</option>
        <option value="Planejamento">Planejamento</option>
        <option value="Teste">Teste</option>
        <option value="Correção">Correção</option>
    </select>`;

    const projectOptions = projects.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    const projectSelect = `<select class="project-select">
        <option value="">Selecione o projeto</option>
        ${projectOptions}
    </select>`;

    row.innerHTML = `
        <td>${actionSelect}</td>
        <td><input type="text" class="project-description" placeholder="Descrição" /></td>
        <td><input type="time" class="project-hours" /></td>
        <td>${projectSelect}</td>
        <td><button class="save-project-btn">💾</button></td>
    `;
    projectsTableBody.appendChild(row);

    // Evento salvar
    row.querySelector('.save-project-btn').addEventListener('click', async () => {
        const action = row.querySelector('.project-action').value;
        const description = row.querySelector('.project-description').value;
        const hours = row.querySelector('.project-hours').value;
        const projectId = row.querySelector('.project-select').value;

        if (!action || !description || !hours || !projectId) {
            alert("Preencha todos os campos!");
            return;
        }

        // Converte a data para yyyy-mm-dd
        const [dia, mes, ano] = selectedDate.split('/');
        const formattedDate = `${ano}-${mes}-${dia}`;

        try {
            await post(`/apontamento-horas/usuario/${usuarioLogado.id}`, {
                data: formattedDate,
                acao: action,
                descricao: description,
                horas: parseFloat(hours),
                projetoId: projectId
            });


            alert("Apontamento salvo com sucesso!");

            // Atualiza dinamicamente a tabela de apontamentos
            projectsTableBody.innerHTML = ""; // limpa a tabela
            await fetchUserApontamentos(selectedDate); // recarrega os apontamentos atualizados

            // Mantém o botão visível
            addProjectBtn.style.display = "flex";

        } catch (err) {
            console.error("Erro ao salvar apontamento:", err);

            try {
                let mensagem = null;

                // Caso err seja uma string (ex: "Erro no POST [400]: {...}")
                if (typeof err === "string") {
                    const match = err.match(/{.*}/s);
                    if (match) {
                        const data = JSON.parse(match[0]);
                        mensagem = data.mensagem;
                    }
                }

                // Caso err seja um objeto com resposta JSON
                else if (typeof err === "object") {
                    // Alguns erros podem vir com err.message contendo JSON
                    if (err.message && err.message.includes("{")) {
                        const match = err.message.match(/{.*}/s);
                        if (match) {
                            const data = JSON.parse(match[0]);
                            mensagem = data.mensagem;
                        }
                    }
                    // Ou já vir como objeto { mensagem: "..." }
                    else if (err.mensagem) {
                        mensagem = err.mensagem;
                    }
                }

                // Exibir a mensagem do backend, se existir
                if (mensagem) {
                    alert(mensagem);
                } else {
                    alert("Erro ao salvar apontamento.");
                }

            } catch (parseError) {
                console.warn("Erro ao processar mensagem do servidor:", parseError);
                alert("Erro ao salvar apontamento.");
            }
        }


    });
}


// ---------------------------------------------------
// Busca apontamentos feitos para o usuário e data
// ---------------------------------------------------
async function fetchUserApontamentos(date) {
    if (!usuarioLogado) return;

    try {
        const userId = usuarioLogado.id;
        const encodedDate = encodeURIComponent(date);
        
        console.log('Buscando apontamentos para usuário:', userId, 'data:', date);
        const apontamentos = await get(`/apontamento-horas/usuario/${userId}?data=${encodedDate}`, {
            "User-Agent": "trackpoint-frontend"
        });
        console.log('Apontamentos retornados:', apontamentos);

        // Limpa a tabela
        projectsTableBody.innerHTML = '';

        if (!apontamentos || apontamentos.length === 0) {
            projectsTableBody.innerHTML = `
                <tr><td colspan="5">Nenhum apontamento encontrado para esta data.</td></tr>
            `;
            addProjectBtn.style.display = 'flex'; // <── corrigido aqui
            return;
        }

        // Renderiza os apontamentos existentes
        apontamentos.forEach(a => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${a.acao}</td>
                <td>${a.descricao}</td>
                <td>${a.horas}</td>
                <td>${a.projeto ? a.projeto.nome : '-'}</td>
                <td><button class="edit-btn">-</button></td>
            `;
            projectsTableBody.appendChild(row);
        });

        // Mostra o botão de adicionar novo apontamento
        addProjectBtn.style.display = 'flex'; // <── corrigido aqui também

    } catch (error) {
        if (error.message.includes('404')) {
            projectsTableBody.innerHTML = `
                <tr><td colspan="5">Nenhum apontamento encontrado para esta data.</td></tr>
            `;
            addProjectBtn.style.display = 'flex'; // <── corrigido
        } else {
            console.error("Erro ao buscar apontamentos:", error);
            projectsTableBody.innerHTML = `
                <tr><td colspan="5">Erro ao carregar apontamentos.</td></tr>
            `;
            addProjectBtn.style.display = 'none'; // <── corrigido
        }
    }
}

// ---------------------------------------------------
// Função para criar pontos de teste
// ---------------------------------------------------
async function criarPontosTeste() {
    if (!usuarioLogado || !selectedDate) {
        alert('Erro: usuário não logado ou data não selecionada');
        return;
    }

    try {
        // Converte a data para o formato do backend
        const [dia, mes, ano] = selectedDate.split('/');
        const dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        
        // Cria pontos de teste para um dia típico
        const pontosTeste = [
            {
                tipo: 'ENTRADA',
                horario: `${dataISO}T08:00:00`,
                localidade: 'Escritório Central',
                observacoes: 'Entrada normal',
                manual: false
            },
            {
                tipo: 'ALMOCO',
                horario: `${dataISO}T12:00:00`,
                localidade: 'Escritório Central',
                observacoes: 'Saída para almoço',
                manual: false
            },
            {
                tipo: 'VOLTA_ALMOCO',
                horario: `${dataISO}T13:00:00`,
                localidade: 'Escritório Central',
                observacoes: 'Volta do almoço',
                manual: false
            },
            {
                tipo: 'SAIDA',
                horario: `${dataISO}T17:00:00`,
                localidade: 'Escritório Central',
                observacoes: 'Saída normal',
                manual: false
            }
        ];

        // Cria os pontos via API
        for (const ponto of pontosTeste) {
            try {
                await post(`/pontos`, { ...ponto, usuarioId: usuarioLogado.id });
            } catch (error) {
                console.warn('Erro ao criar ponto:', ponto.tipo, error);
            }
        }

        alert('✅ Pontos de teste criados com sucesso!');
        
        // Recarrega os dados
        loadReportData();
        
    } catch (error) {
        console.error('Erro ao criar pontos de teste:', error);
        alert('❌ Erro ao criar pontos de teste. Verifique se o backend está funcionando.');
    }
}

// Torna a função global para ser chamada pelo onclick
window.criarPontosTeste = criarPontosTeste;

// --------------------------------------------
// Exportar pontos entre datas (CSV)
// --------------------------------------------
function isoParaBR(str) {
    // yyyy-mm-dd -> dd/mm/yyyy
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return '';
    const [a, m, d] = str.split('-');
    return `${d}/${m}/${a}`;
}

function brParaISO(str) {
    // dd/mm/yyyy -> yyyy-mm-dd
    if (!str || !/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return '';
    const [d, m, a] = str.split('/');
    return `${a}-${m}-${d}`;
}

function readDateInputValue(inputEl) {
    if (!inputEl) return '';
    const val = inputEl.value?.trim() || '';
    // Se o input for type=date, valor vem como yyyy-mm-dd
    if (inputEl.type === 'date') {
        return isoParaBR(val);
    }
    // Caso contrário, assume dd/mm/yyyy
    return val;
}

function setDateInputValue(inputEl, valueBR) {
    // valueBR deve ser dd/mm/yyyy
    if (!inputEl) return;
    if (inputEl.type === 'date') {
        inputEl.value = brParaISO(valueBR);
    } else {
        inputEl.value = valueBR;
    }
}

function ehDataBRValida(str) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return false;
    const [d, m, a] = str.split('/').map(Number);
    const dt = new Date(a, m - 1, d);
    return dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function dataBRParaDate(str) {
    const [d, m, a] = str.split('/').map(Number);
    return new Date(a, m - 1, d);
}

function toCSV(rows, delimiter = ';') {
    const escapeCell = (val) => {
        if (val == null) return '';
        const str = String(val).replace(/\r?\n|\r/g, ' ');
        const needsQuote = str.includes(delimiter) || str.includes('"');
        const escaped = str.replace(/"/g, '""');
        return needsQuote ? `"${escaped}"` : escaped;
    };
    return rows.map(r => r.map(escapeCell).join(delimiter)).join('\r\n');
}

async function exportPontosEntreDatas() {
    try {
        const inicioEl = document.getElementById('start-date');
        const fimEl = document.getElementById('end-date');
        const dataInicio = readDateInputValue(inicioEl); // dd/mm/aaaa
        const dataFim = readDateInputValue(fimEl); // dd/mm/aaaa

        if (!usuarioLogado || !usuarioLogado.id) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = '/login';
            return;
        }

        if (!dataInicio || !dataFim) {
            alert('Informe a data inicial e a data final no formato DD/MM/AAAA.');
            return;
        }
        if (!ehDataBRValida(dataInicio) || !ehDataBRValida(dataFim)) {
            alert('Uma ou mais datas estão inválidas. Use o formato DD/MM/AAAA.');
            return;
        }

        const dIni = dataBRParaDate(dataInicio);
        const dFim = dataBRParaDate(dataFim);
        if (dIni > dFim) {
            alert('A data inicial não pode ser maior que a data final.');
            return;
        }

        const endpoint = `/pontos/${usuarioLogado.id}/periodo?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;
        console.log('Export endpoint:', endpoint);
        let resp;
        try {
            resp = await get(endpoint, { 'User-Agent': 'trackpoint-frontend' });
        } catch (e) {
            // Alguns backends podem responder 404 quando não há dados
            if (String(e.message || '').includes('404')) {
                alert('Nenhum ponto encontrado no período informado.');
                return;
            }
            throw e;
        }

        let lista = [];
        if (Array.isArray(resp)) {
            lista = resp;
        } else if (resp && typeof resp === 'object') {
            // Tenta extrair lista em diferentes chaves usuais
            lista = resp.listaHoras || resp.lista || resp.pontos || resp.itens || [];
        }

        if (!lista || lista.length === 0) {
            alert('Nenhum ponto encontrado no período informado.');
            return;
        }

        // Ordena por data/hora ascendente, se possível
        lista.sort((a, b) => {
            const ha = a.horario || a.dataHora || a.data || a.hora;
            const hb = b.horario || b.dataHora || b.data || b.hora;
            const ta = ha ? new Date(ha).getTime() : 0;
            const tb = hb ? new Date(hb).getTime() : 0;
            return ta - tb;
        });

        const header = ['Data', 'Hora', 'Tipo', 'Manual', 'Localidade', 'Observações', 'Turno'];
        const rows = [header];

        const formatDate = (dt) => dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const formatTime = (dt) => dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });

        for (const p of lista) {
            const rawDate = p.horario || p.dataHora || (p.data && p.hora ? `${p.data}T${p.hora}` : null) || p.data || null;
            const dt = rawDate ? new Date(rawDate) : null;
            const dataStr = dt ? formatDate(dt) : '';
            const horaStr = dt ? formatTime(dt) : '';
            const tipo = p.tipo || p.acao || '-';
            const manual = typeof p.manual === 'boolean' ? (p.manual ? 'Sim' : 'Não') : (p.manual === 1 ? 'Sim' : (p.manual === 0 ? 'Não' : ''));
            const localidade = p.localidade || p.local || '';
            const obs = p.observacoes || p.justificativa || p.obs || '';
            const turno = p.turno || '';
            rows.push([dataStr, horaStr, tipo, manual, localidade, obs, turno]);
        }

        const csv = '\uFEFF' + toCSV(rows, ';'); // BOM para Excel/PT-BR
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeStart = dataInicio.replaceAll('/', '-');
        const safeEnd = dataFim.replaceAll('/', '-');
        a.href = url;
        a.download = `pontos_${safeStart}_a_${safeEnd}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao exportar pontos:', error);
        alert('Erro ao exportar pontos. Tente novamente.');
    }
}
