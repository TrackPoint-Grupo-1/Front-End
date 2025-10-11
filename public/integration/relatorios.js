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
            tableBody.innerHTML = `<tr><td colspan="4">Selecione uma data.</td></tr>`;
            return;
        }

        const encodedDate = encodeURIComponent(selectedDate);

        // 1️⃣ Busca os pontos normais
        const response = await fetch(`http://localhost:8080/pontos/1?data=${encodedDate}`, {
            method: "GET",
            headers: { "User-Agent": "trackpoint-frontend" }
        });

        if (!response.ok) throw new Error(`Erro ao buscar dados (${response.status})`);

        const data = await response.json();

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4">Nenhum registro encontrado para esta data.</td></tr>`;
        } else {
            data.forEach(entry => {
                const horario = new Date(entry.horario);
                const horaLocal = horario.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "America/Sao_Paulo"
                });

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${entry.tipo}</td>
                    <td>${horaLocal}</td>
                    <td>${entry.observacoes || "-"}</td>
                    <td><button class="edit-btn">✏️</button></td>
                `;
                tableBody.appendChild(row);
            });
        }

        // 2️⃣ Busca as horas extras
        const [dia, mes, ano] = selectedDate.split('/');
        const dataInicio = `${dia}/${mes}/${ano}`;
        const dataFim = `${dia}/${mes}/${ano}`;
        const encodedInicio = encodeURIComponent(dataInicio);
        const encodedFim = encodeURIComponent(dataFim);

        const extraResponse = await fetch(
            `http://localhost:8080/horas-extras/listar-horas/1?dataInicio=${encodedInicio}&dataFim=${encodedFim}`,
            { method: "GET", headers: { "User-Agent": "trackpoint-frontend" } }
        );

        if (extraResponse.ok) {
            const extrasData = await extraResponse.json();
            const totalHoras = extrasData.horasTotal?.totalHoras || 0;

            if (totalHoras > 0) {
                // Converte totalHoras (ex: 1.5) para HH:MM
                const horas = Math.floor(totalHoras);
                const minutos = Math.round((totalHoras - horas) * 60);
                const formattedHoras = String(horas).padStart(2, '0');
                const formattedMinutos = String(minutos).padStart(2, '0');
                const horaExtraFormatada = `${formattedHoras}:${formattedMinutos}`;

                // Pega a primeira justificativa disponível
                const justificativa = extrasData.listaHoras?.[0]?.justificativa || "-";

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>HORA_EXTRA</td>
                    <td>${horaExtraFormatada}</td>
                    <td>${justificativa}</td>
                    <td>-</td>
                `;
                tableBody.appendChild(row);
            }
        }

        document.getElementById('hours-report').classList.remove('hidden');

    } catch (error) {
        console.error("Erro ao carregar pontos:", error);
        tableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar os pontos para a data informada.</td></tr>`;
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

function addHoursEntry() {
    alert('Funcionalidade de adicionar entrada de horas será implementada');
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