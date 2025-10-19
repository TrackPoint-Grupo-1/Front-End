import { get, patch } from "../connection.js";

(function () {
	// Utils
	const parseDateBR = (iso) => {
		if (!iso) return "-";
		const [y, m, d] = iso.split("-");
		return `${d}/${m}/${y}`;
	};

	const statusStyles = {
		PENDENTE: { cls: "badge-pending", style: "background:#fde68a; color:#92400e;" },
		APROVADO: { cls: "badge-approved", style: "background:#bbf7d0; color:#065f46;" },
		REJEITADO: { cls: "badge-rejected", style: "background:#fecaca; color:#991b1b;" },
	};

	// Cache de usuários para evitar requisições repetidas
	const userCache = new Map();
	const getUsuario = (id) => {
		if (!id) return Promise.resolve(null);
		if (userCache.has(id)) return userCache.get(id);
		const p = get(`/usuarios/${id}`).catch(() => null);
		userCache.set(id, p);
		return p;
	};

	const getGestorId = () => {
		const fromBody = document.body?.dataset?.gestorId;
		const fromStore = typeof localStorage !== "undefined" ? localStorage.getItem("gestorId") : null;
		return fromBody || fromStore || "2";
	};

	const findCardByTitle = (title) => {
		const cards = Array.from(document.querySelectorAll(".card"));
		return cards.find((card) => {
			const h3 = card.querySelector(".card-header .card-title");
			return h3 && h3.textContent.trim().toLowerCase() === title.trim().toLowerCase();
		});
	};

	// Helpers para identificar "sem dados" oriundos do backend
	const extractErrorMessage = (e) =>
		(e?.mensagem) ||
		(e?.response?.data?.mensagem) ||
		(e?.response?.data) ||
		(e?.message) ||
		"";

	const isNoDataError = (e) => {
		const msg = String(extractErrorMessage(e)).toLowerCase();
		// cobre mensagens com e sem acento
		return (
			msg.includes("nenhuma solicitação pendente") ||
			msg.includes("nenhuma solicitacao pendente") ||
			e?.status === 404 ||
			e?.response?.status === 404 ||
			e?.status === 204 ||
			e?.response?.status === 204
		);
	};

	const showEmpty = (tableContainer, emptyState) => {
		if (tableContainer) tableContainer.style.display = "none";
		if (emptyState) emptyState.style.display = "block";
	};

	const showTable = (tableContainer, emptyState) => {
		if (tableContainer) tableContainer.style.display = "";
		if (emptyState) emptyState.style.display = "none";
	};

	const setTbodyMessage = (tbody, message, tableContainer, emptyState) => {
		showTable(tableContainer, emptyState);
		tbody.innerHTML = `
			<tr>
				<td colspan="6" style="text-align:center; color:#64748b; padding:1rem;">${message}</td>
			</tr>
		`;
	};

	// Tornar assíncrono para enriquecer com dados do usuário
	const renderRows = async (tbody, solicitacoes) => {
		if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
			tbody.innerHTML = "";
			return;
		}

		const rowsHtml = await Promise.all(
			solicitacoes.map(async (s) => {
				const u = await getUsuario(s.usuarioId);
				const nome = u?.nome || `Colaborador #${s.usuarioId}`;
				const email = u?.email || `ID: ${s.usuarioId}`;
				const styles = statusStyles[s.status] || statusStyles.PENDENTE;
				const isAprovado = s.status === "APROVADO";
				const isRejeitado = s.status === "REJEITADO";
				return `
				<tr data-row-id="${s.id}">
					<td>
						<div>
							<div style="font-weight: 500;">${nome}</div>
							<div style="font-size: 0.75rem; color: #64748b;">${email}</div>
						</div>
					</td>
					<td>${parseDateBR(s.data)}</td>
					<td>${s.justificativa || "-"}</td>
					<td>${s.observacao || "-"}</td>
					<td>
						<span class="badge ${styles.cls}" style="${styles.style} padding:0.25rem 0.5rem; border-radius:6px; font-weight:600; font-size:0.85rem;">
							${s.status}
						</span>
					</td>
					<td>
						<div style="display: flex; gap: 0.5rem;">
							<button class="btn btn-success btn-sm" data-action="aprovar" ${isAprovado ? "disabled" : ""}>APROVAR</button>
							<button class="btn btn-secondary btn-sm" data-action="rejeitar" ${isRejeitado ? "disabled" : ""}>RETORNAR</button>
						</div>
					</td>
				</tr>`;
			})
		);

		tbody.innerHTML = rowsHtml.join("");
	};

	const attachRowActions = (tbody, reloadFn) => {
		tbody.addEventListener("click", async (ev) => {
			const btn = ev.target.closest("button[data-action]");
			if (!btn) return;
			const tr = btn.closest("tr[data-row-id]");
			if (!tr) return;

			const id = tr.getAttribute("data-row-id");
			const action = btn.getAttribute("data-action");
			const novoStatus = action === "aprovar" ? "APROVADO" : "REJEITADO";

			btn.disabled = true;
			try {
				await patch(`/solicitacoes/${id}/status`, { status: novoStatus });
				await reloadFn(); // re-render after update
			} catch (e) {
				console.error(e);
				btn.disabled = false;
				alert("Não foi possível atualizar o status. Tente novamente.");
			}
		});
	};

	const attachSearch = (cardEl, tbody) => {
		const input = cardEl.querySelector('.card-header input[type="text"]');
		if (!input) return;

		const filterRows = () => {
			const q = input.value.trim().toLowerCase();
			const rows = Array.from(tbody.querySelectorAll("tr[data-row-id]"));

			if (!q) {
				rows.forEach((r) => (r.style.display = ""));
				return;
			}

			let visibleCount = 0;
			rows.forEach((r) => {
				const text = r.innerText.toLowerCase();
				const visible = text.includes(q);
				r.style.display = visible ? "" : "none";
				if (visible) visibleCount++;
			});

			const infoRow = tbody.querySelector("tr.__no_results");
			if (visibleCount === 0) {
				if (!infoRow) {
					const tr = document.createElement("tr");
					tr.className = "__no_results";
					tr.innerHTML =
						'<td colspan="6" style="text-align:center; color:#64748b; padding:1rem;">Nenhum resultado para a busca.</td>';
					tbody.appendChild(tr);
				}
			} else if (infoRow) {
				infoRow.remove();
			}
		};

		input.addEventListener("input", filterRows);
	};

	document.addEventListener("DOMContentLoaded", () => {
		const card = findCardByTitle("Solicitações de Correção Manual");
		if (!card) return;

		const tbody = card.querySelector("tbody");
		if (!tbody) return;

		const tableContainer = card.querySelector(".table-container");
		const emptyState = card.querySelector("#empty-solicitacoes-correcao-manual");
		const gestorId = getGestorId();

		const load = async () => {
			setTbodyMessage(tbody, "Carregando...", tableContainer, emptyState);
			try {
				const data = await get(`/solicitacoes/gestor/${gestorId}`);
				// Se vier objeto com "mensagem" do backend, considerar como vazio.
				if (!Array.isArray(data) || data.length === 0 || (data && data.mensagem)) {
					tbody.innerHTML = "";
					showEmpty(tableContainer, emptyState);
					return;
				}
				showTable(tableContainer, emptyState);
				await renderRows(tbody, data);
			} catch (e) {
				// Se o backend retornou "nenhuma solicitação..." como erro/404/204, mostrar estado vazio
				if (isNoDataError(e)) {
					console.info("Sem dados de solicitações:", extractErrorMessage(e));
					tbody.innerHTML = "";
					showEmpty(tableContainer, emptyState);
					return;
				}
				console.error(e);
				setTbodyMessage(tbody, "Erro ao carregar solicitações.", tableContainer, emptyState);
			}
		};

		attachRowActions(tbody, load);
		attachSearch(card, tbody);
		load();
	});
})();

