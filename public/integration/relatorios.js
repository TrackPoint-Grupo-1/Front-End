// relatorio.js
import { get, patch, post } from "./connection.js";

// --------------------------------------------
// Variáveis principais
// --------------------------------------------
const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
let currentTab = 'hours';
let selectedDate = '';
let addedRows = 0;

const addHoursBtn = document.querySelector('#hours-report .add-btn');
const addProjectBtn = document.querySelector('#projects-report .add-btn');

const projectsTableBody = document.getElementById('projects-table-body');
const projectsError = document.getElementById('projects-error');

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-btn').addEventListener('click', searchReports);

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
    const formattedDate = `${day}/${month}/${year}`;
    document.getElementById('date-input').value = formattedDate;
    selectedDate = formattedDate;

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
    selectedDate = dateInput.value;
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
            `/solicitacoes/listar-por-periodo/${usuarioLogado.id}?dataInicio=${encodedInicio}&dataFim=${encodedFim}`,
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
        const data = await get(`/pontos/${usuarioLogado.id}?data=${encodedDate}`, { "User-Agent": "trackpoint-frontend" });

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5">Nenhum registro encontrado para esta data.</td></tr>`;
            controlarBotaoAdicionar(false);
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
        const extrasData = await get(
            `/horas-extras/listar-horas/${usuarioLogado.id}?dataInicio=${encodedInicio}&dataFim=${encodedFim}`,
            { "User-Agent": "trackpoint-frontend" }
        );

        const totalHoras = extrasData.horasTotal?.totalHoras || 0;
        if (totalHoras > 0) {
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
}

// --------------------------------------------
// Relatório de Projetos
// --------------------------------------------
async function loadProjectsData() {
    if (!selectedDate) return;

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

        const apontamentos = await get(`/apontamento-horas/usuario/${userId}?data=${encodedDate}`, {
            "User-Agent": "trackpoint-frontend"
        });

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

