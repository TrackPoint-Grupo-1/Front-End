import { get, patch, post } from "./connection.js";

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-btn').addEventListener('click', searchReports);
});


let currentTab = 'hours';
let selectedDate = '';

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

    if (currentTab === 'hours') {
        await loadHoursData();
    } else {
        loadProjectsData();
    }
}

async function loadHoursData() {
    const tableBody = document.getElementById('hours-table-body');
    tableBody.innerHTML = ''; // limpa antes

    try {
        if (!selectedDate) {
            tableBody.innerHTML = `<tr><td colspan="5">Selecione uma data.</td></tr>`;
            return;
        }

        const encodedDate = encodeURIComponent(selectedDate);

        // 1️⃣ Busca os pontos normais (GET com função genérica)
        const data = await get(`/pontos/1?data=${encodedDate}`, {
            "User-Agent": "trackpoint-frontend"
        });

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5">Nenhum registro encontrado para esta data.</td></tr>`;
        } else {
            data.forEach(entry => {
                const horario = new Date(entry.horario);
                const horaLocal = horario.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "America/Sao_Paulo"
                });

                // Verifica se o ponto é automático
                const isAutomatico = entry.manual === false
                const acaoDisplay = isAutomatico
                    ? "Marcação de Ponto"
                    : "Marcação de Ponto Manual";
                const tipoDisplay = entry.tipo;
                const observacaoDisplay = entry.observacoes || "-";

                // Se for automático, não mostra botão editar
                const editButton = isAutomatico ? "-" : `<button class="edit-btn">✏️</button>`;

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${acaoDisplay}</td>
                    <td>${tipoDisplay}</td>
                    <td>${horaLocal}</td>
                    <td>${observacaoDisplay}</td>
                    <td>${editButton}</td>
                `;
                tableBody.appendChild(row);
            });
        }

        // 2️⃣ Busca as horas extras (também com get())
        const [dia, mes, ano] = selectedDate.split('/');
        const dataInicio = `${dia}/${mes}/${ano}`;
        const dataFim = `${dia}/${mes}/${ano}`;
        const encodedInicio = encodeURIComponent(dataInicio);
        const encodedFim = encodeURIComponent(dataFim);

        const extrasData = await get(
            `/horas-extras/listar-horas/1?dataInicio=${encodedInicio}&dataFim=${encodedFim}`,
            { "User-Agent": "trackpoint-frontend" }
        );

        const totalHoras = extrasData.horasTotal?.totalHoras || 0;

        if (totalHoras > 0) {
            // Converte totalHoras (ex: 1.5) para HH:MM
            const horas = Math.floor(totalHoras);
            const minutos = Math.round((totalHoras - horas) * 60);
            const formattedHoras = String(horas).padStart(2, '0');
            const formattedMinutos = String(minutos).padStart(2, '0');
            const horaExtraFormatada = `${formattedHoras}:${formattedMinutos}`;

            // Pega a primeira justificativa disponível
            const justificativa = extrasData.listaHoras?.[0]?.justificativa || "Hora extra não justificada";
            const horaExtraId = extrasData.listaHoras?.[0]?.id;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>Hora Extra</td>
                <td>-</td>
                <td>${horaExtraFormatada}</td>
                <td class="justificativa-cell" style="
                    cursor: pointer;
                    position: relative;
                    color: #1e90ff;
                    text-decoration: underline;
                ">
                    ${justificativa}
                </td>
                <td>-</td>
            `;
            tableBody.appendChild(row);

            // 🎯 Evento de clique na célula de justificativa
            const justificativaCell = row.querySelector('.justificativa-cell');
            justificativaCell.addEventListener('click', () => {
                justificativaCell.style.background = "#f9fff9";
                justificativaCell.style.transition = "background 0.3s ease";

                // Efeito hover
                justificativaCell.addEventListener("mouseover", () => {
                    justificativaCell.style.background = "#eafbea";
                });
                justificativaCell.addEventListener("mouseout", () => {
                    justificativaCell.style.background = "#f9fff9";
                });

                // Evita abrir mais de um dropdown
                if (justificativaCell.querySelector('select')) return;

                const select = document.createElement('select');
                select.innerHTML = `
                    <option value="">⚙️ Selecione uma justificativa</option>
                    <option value="Cumprimento de Prazo Crítico">Cumprimento de Prazo Crítico</option>
                    <option value="Imprevisto/Ocorrencia Urgente">Imprevisto/Ocorrencia Urgente</option>
                    <option value="Demanda Excepcional">Demanda Excepcional</option>
                `;

                Object.assign(select.style, {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    zIndex: "10",
                    padding: "8px",
                    border: "2px solid #0d9488",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    color: "#333",
                    fontSize: "14px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                    outline: "none",
                    appearance: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out"
                });

                justificativaCell.innerHTML = "";
                justificativaCell.appendChild(select);
                select.focus();

                // 🔁 Quando o usuário seleciona uma justificativa
                select.addEventListener('change', async () => {
                    const novaJustificativa = select.value;
                    if (!novaJustificativa) return;

                    try {
                        await patch(`/horas-extras/${horaExtraId}`, { justificativa: novaJustificativa }, {
                            "User-Agent": "trackpoint-frontend"
                        });

                        justificativaCell.textContent = novaJustificativa;

                        // 🔔 Alerta rápido de sucesso
                        const alertBox = document.createElement('div');
                        alertBox.textContent = "Justificativa atualizada com sucesso!";
                        alertBox.style.position = "fixed";
                        alertBox.style.top = "20px";
                        alertBox.style.left = "50%";
                        alertBox.style.transform = "translateX(-50%)";
                        alertBox.style.background = "#4CAF50";
                        alertBox.style.color = "#fff";
                        alertBox.style.padding = "10px 20px";
                        alertBox.style.borderRadius = "8px";
                        alertBox.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                        document.body.appendChild(alertBox);

                        setTimeout(() => alertBox.remove(), 2500);
                    } catch (error) {
                        console.error("Erro ao atualizar justificativa:", error);
                        justificativaCell.textContent = "-";
                        alert("Erro ao atualizar justificativa.");
                    }
                });

                // Se clicar fora, restaura o texto original
                select.addEventListener('blur', () => {
                    if (!select.value) justificativaCell.textContent = justificativa;
                });
            });
        }

        document.getElementById('hours-report').classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao carregar pontos:", error);
        tableBody.innerHTML = `<tr><td colspan="5">Pontos não encontrado para a data informada </td></tr>`;
    }
}

// Mantém a aba e mensagens padrão
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.report-content').forEach(content => content.classList.add('hidden'));
    document.getElementById('no-date-message').classList.add('hidden');

    document.getElementById(tab + '-tab').classList.add('active');
    currentTab = tab;

    if (selectedDate) {
        loadReportData();
    }
}

function showNoDateMessage() {
    document.querySelectorAll('.report-content').forEach(content => content.classList.add('hidden'));
    document.getElementById('no-date-message').classList.remove('hidden');
}

function hideNoDateMessage() {
    document.getElementById('no-date-message').classList.add('hidden');
}

// Mantém as funções de exemplo (placeholder)
function loadProjectsData() {
    document.getElementById('projects-report').classList.remove('hidden');
}

let addedRows = 0; // controla quantas linhas manuais foram adicionadas
const tiposManuais = ["ENTRADA", "ALMOCO", "VOLTA_ALMOCO", "SAIDA"];

document.querySelector('.add-btn').addEventListener('click', addHoursEntry);

function addHoursEntry() {
    const tableBody = document.getElementById('hours-table-body');

    if (addedRows >= tiposManuais.length) return;

    // Adiciona a próxima linha manual
    const tipo = tiposManuais[addedRows];
    const row = document.createElement("tr");

    row.innerHTML = `
        <td>Marcação de Ponto Manual</td>
        <td>${tipo}</td>
        <td><input type="time" class="hora-input" /></td>
        <td>
            <select class="justificativa-select" style="
                padding: 6px;
                border: 2px solid #0d9488;
                border-radius: 6px;
                background-color: #fff;
                color: #333;
                font-size: 14px;
                cursor: pointer;
                appearance: none;
            ">
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

    // Desabilita o botão quando todas as 4 linhas forem adicionadas
    if (addedRows >= tiposManuais.length) {
        document.querySelector('.add-btn').disabled = true;

        // Adiciona botão de confirmação
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = "Confirmar Pontos";
        confirmBtn.className = "confirm-btn";
        confirmBtn.style.marginTop = "10px";
        confirmBtn.addEventListener('click', async () => {

            const manualRows = tiposManuais.map(tipo =>
                Array.from(tableBody.querySelectorAll("tr")).find(r =>
                    r.cells[0].textContent === "Marcação de Ponto Manual" && r.cells[1].textContent === tipo
                )
            );

            // Validação: todos os campos preenchidos
            for (const r of manualRows) {
                const hora = r.querySelector(".hora-input")?.value;
                const justificativa = r.querySelector(".justificativa-select")?.value;
                if (!hora || !justificativa) {
                    alert("Preencha horário e justificativa de todas as linhas!");
                    return;
                }
            }

            // Confirmação antes do envio
            if (!confirm("Deseja realmente enviar os pontos manuais?")) return;

            try {
                for (const r of manualRows) {
                    const horaInput = r.querySelector(".hora-input").value;
                    const justificativa = r.querySelector(".justificativa-select").value;

                    const ponto = {
                        usuarioId: 1,
                        tipo: r.cells[1].textContent,
                        horario: `${selectedDate.split('/').reverse().join('-')}T${horaInput}:00`,
                        localidade: "Escritório",
                        observacoes: justificativa,
                    };

                    await post("/pontos/manual", ponto, { "User-Agent": "trackpoint-frontend" });
                }

                alert("Pontos manuais adicionados com sucesso!");
                addedRows = 0;
                document.querySelector('.add-btn').disabled = false;
                tableBody.innerHTML = ''; // limpa para recarregar
                loadHoursData(); // recarrega os pontos
                confirmBtn.remove();

            } catch (error) {
                console.error("Erro ao adicionar pontos manuais:", error);

                // Verifica se o erro veio do backend
                if (error.message.includes("Limite de 10 pontos manuais atingido")) {
                    alert("Não foi possível adicionar pontos: você já atingiu o limite de 10 pontos manuais.");
                } else {
                    alert("Erro ao adicionar pontos manuais.");
                }
            }
        });

        tableBody.parentElement.appendChild(confirmBtn);
    }
}


function addProjectEntry() {
    alert('Funcionalidade de adicionar entrada de projeto será implementada');
}

// Inicializa com data padrão para teste
document.addEventListener('DOMContentLoaded', function () {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    document.getElementById('date-input').value = formattedDate;
});