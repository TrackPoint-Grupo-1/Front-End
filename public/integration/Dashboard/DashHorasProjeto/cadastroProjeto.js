// Integra o cadastro de projetos com o backend
// - Lista todos os usuários: GET /usuarios
// - Filtra GERENTE e USUARIO para compor listas
// - Pesquisa por nome nas listas
// - Envia POST /projetos com payload exigido

import { get, post } from "../../connection.js";

// Elementos do DOM
const form = document.querySelector('#project-form');
const inputNome = document.querySelector('#project-name');
const inputDesc = document.querySelector('#project-desc');
const inputDeadline = document.querySelector('#project-deadline');
const errBox = document.querySelector('#project-form-error');

const searchGerentes = document.querySelector('#search-gerentes');
const listGerentes = document.querySelector('#list-gerentes');
const searchUsuarios = document.querySelector('#search-usuarios');
const listUsuarios = document.querySelector('#list-usuarios');

// Estado em memória
let allGerentes = [];
let allUsuarios = [];
const selectedGerentes = new Set();
const selectedUsuarios = new Set();

function normalize(str) {
	return (str || "")
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

function renderList(container, data, selectedSet) {
	if (!container) return;
	if (!Array.isArray(data) || data.length === 0) {
		container.innerHTML = '<div class="text-sm text-gray-500">Nenhum resultado</div>';
		return;
	}

	const frag = document.createDocumentFragment();
	container.innerHTML = '';
	data.forEach(u => {
		const row = document.createElement('label');
		row.style.display = 'flex';
		row.style.alignItems = 'center';
		row.style.gap = '0.5rem';
		row.style.padding = '0.25rem 0.5rem';

		const cb = document.createElement('input');
		cb.type = 'checkbox';
		cb.value = u.id;
		cb.checked = selectedSet.has(u.id);
		cb.addEventListener('change', () => {
			if (cb.checked) selectedSet.add(u.id); else selectedSet.delete(u.id);
		});

		const info = document.createElement('div');
		info.style.display = 'flex';
		info.style.flexDirection = 'column';
		const nm = document.createElement('span');
		nm.textContent = u.nome || `Usuário ${u.id}`;
		nm.style.fontSize = '0.9rem';
		nm.style.fontWeight = '500';
		const meta = document.createElement('span');
		meta.textContent = u.email || '';
		meta.style.color = '#6b7280';
		meta.style.fontSize = '0.8rem';
		info.appendChild(nm);
		info.appendChild(meta);

		row.appendChild(cb);
		row.appendChild(info);
		frag.appendChild(row);
	});
	container.appendChild(frag);
}

function filterAndRender() {
	const qg = normalize(searchGerentes?.value);
	const qu = normalize(searchUsuarios?.value);
	const filteredGer = !qg ? allGerentes : allGerentes.filter(u => normalize(u.nome).includes(qg));
	const filteredUsu = !qu ? allUsuarios : allUsuarios.filter(u => normalize(u.nome).includes(qu));
	renderList(listGerentes, filteredGer, selectedGerentes);
	renderList(listUsuarios, filteredUsu, selectedUsuarios);
}

async function loadUsuarios() {
	try {
		// Cabeçalho opcional para padronizar agente
		const usuarios = await get('/usuarios', { 'User-Agent': 'trackpoint-frontend' });
		const arr = Array.isArray(usuarios) ? usuarios : [];
		allGerentes = arr.filter(u => (u.cargo || '').toUpperCase() === 'GERENTE');
		allUsuarios = arr.filter(u => (u.cargo || '').toUpperCase() === 'USUARIO');
		filterAndRender();
	} catch (e) {
		console.error('Erro ao carregar usuários:', e);
		if (listGerentes) listGerentes.innerHTML = '<div class="text-sm text-red-600">Erro ao carregar gerentes.</div>';
		if (listUsuarios) listUsuarios.innerHTML = '<div class="text-sm text-red-600">Erro ao carregar colaboradores.</div>';
	}
}

function showError(msg) {
	if (!errBox) return;
	errBox.textContent = msg;
	errBox.style.display = 'block';
}

function clearError() {
	if (!errBox) return;
	errBox.textContent = '';
	errBox.style.display = 'none';
}

function formatDateToDDMMYYYY(isoDate) {
	// Espera yyyy-MM-dd do input type=date
	if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
	const [y, m, d] = isoDate.split('-');
	return `${d}-${m}-${y}`;
}

// Listeners de busca
searchGerentes?.addEventListener('input', filterAndRender);
searchUsuarios?.addEventListener('input', filterAndRender);

// Submit do formulário
form?.addEventListener('submit', async (e) => {
	e.preventDefault();
	clearError();

	const nome = inputNome?.value?.trim();
	const descricao = inputDesc?.value?.trim();
	const previsaoIso = inputDeadline?.value;
	const previsaoEntrega = formatDateToDDMMYYYY(previsaoIso);

	if (!nome || !descricao || !previsaoEntrega) {
		showError('Preencha nome, descrição e previsão de entrega.');
		return;
	}
	if (selectedGerentes.size === 0) {
		showError('Selecione pelo menos um gerente.');
		return;
	}
	if (selectedUsuarios.size === 0) {
		showError('Selecione pelo menos um colaborador.');
		return;
	}

	const body = {
		nome,
		descricao,
		gerentesIds: Array.from(selectedGerentes),
		usuariosIds: Array.from(selectedUsuarios),
		previsaoEntrega
	};

	try {
		await post('/projetos', body, { 'User-Agent': 'trackpoint-frontend' });
		alert('Projeto cadastrado com sucesso!');
		// Resetar formulário e seleções
		form.reset();
		selectedGerentes.clear();
		selectedUsuarios.clear();
		filterAndRender();
	} catch (e) {
		console.error('Erro no cadastro de projeto:', e);
		showError(e?.message || 'Erro ao cadastrar projeto.');
	}
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
	loadUsuarios();
});

