import { get, post } from "./connection.js";

document.addEventListener('DOMContentLoaded', function () {
	const userId = 1; // ajustar conforme contexto do usuário autenticado
	const maxAllowed = 5;
	const footerEl = document.getElementById('footerMessage');
	const submitBtn = document.getElementById('submitButton');
	const form = document.querySelector('form');
	const dataInput = document.getElementById('dataAjuste');
	const justificativaSelect = document.getElementById('justificativa');
	const observacoesInput = document.getElementById('observacoes');

	let fetchedList = [];        // lista recebida do servidor
	let remainingGlobal = maxAllowed; // restante calculado

	function pad2(n){ return n < 10 ? '0' + n : '' + n; }
	function formatDDMMYYYY(d){
		return pad2(d.getDate()) + '/' + pad2(d.getMonth()+1) + '/' + d.getFullYear();
	}

	// primeiro e último dia do mês atual
	const now = new Date();
	const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const dataInicio = formatDDMMYYYY(firstDay);
	const dataFim = formatDDMMYYYY(lastDay);

	const urlList = `/solicitacoes/listar-por-periodo/${userId}?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;
	const urlCreate = `/solicitacoes?usuarioId=${userId}`;

	async function loadAndUpdate() {
		try {
			const json = await get(urlList);

			// suporta retorno como array ou objeto com lista
			let list = [];
			if (Array.isArray(json)) list = json;
			else if (Array.isArray(json.items)) list = json.items;
			else if (Array.isArray(json.solicitacoes)) list = json.solicitacoes;

			fetchedList = list; // guarda para checagens posteriores

			const count = list.length;
			const remaining = Math.max(0, maxAllowed - count);
			remainingGlobal = remaining;
			const remainingText = remaining < 10 ? '0' + remaining : String(remaining);

			if (remaining <= 0) {
				footerEl.innerHTML = `Limite mensal atingido. Você possui <b>00 alterações manuais</b> até <b>${dataFim}</b>. Não é possível criar nova solicitação neste mês.`;
				submitBtn.disabled = true;
				submitBtn.setAttribute('aria-disabled', 'true');
			} else {
				footerEl.innerHTML = `A solicitação é necessária? Você ainda possui <b>${remainingText} alterações manuais até ${dataFim}.</b>`;
				submitBtn.disabled = false;
				submitBtn.removeAttribute('aria-disabled');
			}
		} catch (e) {
			// em caso de erro, mostra valor padrão e permite envio
			footerEl.innerHTML = `A solicitação é necessária? Você ainda possui <b>${maxAllowed} alterações manuais até ${dataFim}.</b>`;
			submitBtn.disabled = false;
			fetchedList = [];
			remainingGlobal = maxAllowed;
		}
	}

	// Verifica se já existe solicitação para a data (busca em campos comuns)
	function existingRequestFor(formattedDate) {
		if (!fetchedList || !fetchedList.length) return false;
		for (const it of fetchedList) {
			// tenta vários nomes de campo comuns que o backend pode retornar
			const candidates = [
				it.dataAjuste, it.data, it.dataSolicitacao,
				it.dataRegistro, it.data_ponto, it.dataHora, it.dataPedido
			];
			for (const c of candidates) {
				if (!c) continue;
				// normaliza strings: se já estiver no formato dd/MM/yyyy, compara direto
				const s = String(c);
				if (s === formattedDate) return true;
				// ou se contiver a sequência (alguns retornos podem ter timestamp ou ISO)
				if (s.indexOf(formattedDate) !== -1) return true;
			}
		}
		return false;
	}

	// cria/obtém elemento de aviso logo abaixo do campo de data
	function ensureDateWarningElement() {
		let warnEl = document.getElementById('dateWarning');
		if (!warnEl) {
			const wrapper = dataInput.parentElement || dataInput.closest('.form-group') || dataInput;
			warnEl = document.createElement('p');
			warnEl.id = 'dateWarning';
			warnEl.style.color = '#b00020'; // cor de erro discreta
			warnEl.style.marginTop = '6px';
			warnEl.style.fontSize = '0.95rem';
			wrapper.appendChild(warnEl);
		}
		return warnEl;
	}

	// checagem ao mudar a data
	if (dataInput) {
		dataInput.addEventListener('change', function () {
			const val = dataInput.value;
			const warnEl = ensureDateWarningElement();
			if (!val) {
				warnEl.textContent = '';
				// mantém estado anterior (limite mensal)
				submitBtn.disabled = remainingGlobal <= 0;
				return;
			}

			// formata a data selecionada para dd/MM/yyyy
			const selected = new Date(val + 'T00:00:00'); // evita timezone
			const formatted = formatDDMMYYYY(selected);

			// verifica duplicata
			if (existingRequestFor(formatted)) {
				warnEl.textContent = 'Já existe uma solicitação para esta data.';
				footerEl.innerHTML = `Já existe uma solicitação para <b>${formatted}</b>. Não é possível criar outra para a mesma data.`;
				submitBtn.disabled = true;
				return;
			}

			// se não houver duplicata, restaura verificação do limite mensal
			warnEl.textContent = '';
			if (remainingGlobal <= 0) {
				footerEl.innerHTML = `Limite mensal atingido. Você possui <b>00 alterações manuais</b> até <b>${dataFim}</b>.`;
				submitBtn.disabled = true;
			} else {
				const remainingText = remainingGlobal < 10 ? '0' + remainingGlobal : String(remainingGlobal);
				footerEl.innerHTML = `A solicitação é necessária? Você ainda possui <b>${remainingText} alterações manuais até ${dataFim}.</b>`;
				submitBtn.disabled = false;
			}
		});
	}

	// carregar contagem ao iniciar
	loadAndUpdate();

	// prevenção adicional no envio do formulário + integração POST
	form.addEventListener('submit', async function (e) {
		// bloqueia se limite atingido
		if (submitBtn.disabled) {
			e.preventDefault();
			alert('Você atingiu o limite de solicitações manuais para este mês.');
			return;
		}

		// valida campos
		const val = dataInput && dataInput.value; // formato yyyy-MM-dd
		const justIdx = justificativaSelect?.selectedIndex ?? -1;
		const justText = justIdx > -1 ? justificativaSelect.options[justIdx].text : '';
		const obs = (observacoesInput?.value || '').trim();

		if (!val || !justText || !obs) {
			e.preventDefault();
			alert('Preencha todos os campos obrigatórios.');
			return;
		}

		// checa duplicata pela data em dd/MM/yyyy
		const formatted = formatDDMMYYYY(new Date(val + 'T00:00:00'));
		if (existingRequestFor(formatted)) {
			e.preventDefault();
			alert('Já existe uma solicitação para a data selecionada.');
			return;
		}

		// monta payload conforme endpoint
		const payload = {
			data: val,                 // yyyy-MM-dd (valor do input date)
			justificativa: justText,   // texto da opção selecionada
			observacao: obs            // mapear para o nome esperado pelo backend
		};

		// envia
		e.preventDefault();
		const originalText = submitBtn.textContent;
		submitBtn.textContent = 'Enviando...';
		submitBtn.disabled = true;

		try {
			await post(urlCreate, payload);
			footerEl.innerHTML = `Solicitação criada com sucesso para <b>${formatted}</b>.`;
			alert('Solicitação criada com sucesso!');
			form.reset();
			// após criar, recarrega a contagem e lista
			await loadAndUpdate();
		} catch (err) {
			// Exibe mensagem do backend (quando disponível)
			const msg = await getErrorMessage(err);
			alert(msg);
			footerEl.innerHTML = `Não foi possível criar a solicitação. ${msg}`;
			// revalida estado conforme limite atual
			await loadAndUpdate();
		} finally {
			submitBtn.textContent = originalText;
			// loadAndUpdate já ajusta disabled, não reabilitar aqui manualmente
		}
	});
});