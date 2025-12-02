function getUsuarioLogado() {
  try {
    const raw = localStorage.getItem('usuarioLogado');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDataInicio(criadoEm) {
  if (!criadoEm) return 'N/A';
  const start = new Date(criadoEm);
  if (isNaN(start.getTime())) return 'N/A';
  return start.toLocaleDateString('pt-BR');
}

function popularPerfil(usuario) {
  const nomeEl = document.querySelector('.usuario-nome');
  const cargoTituloEl = document.querySelector('.usuario-cargo');
  const infoLista = document.querySelector('.info-lista');

  if (nomeEl) nomeEl.textContent = usuario?.nome || '—';
  if (cargoTituloEl) cargoTituloEl.textContent = `${usuario?.cargo || '—'} - ${usuario?.area || '—'}`;

  if (infoLista) {
    const emailP = infoLista.querySelector('p:nth-child(1)');
    const areaP = infoLista.querySelector('p:nth-child(2)');
    const cargoP = infoLista.querySelector('p:nth-child(3)');
    const jornadaP = infoLista.querySelector('p:nth-child(4)');
    const tempoCasaP = infoLista.querySelector('p:nth-child(5)');

    if (emailP) emailP.innerHTML = `<strong>Email:</strong> ${usuario?.email || '—'}`;
    if (areaP) areaP.innerHTML = `<strong>Área:</strong> ${usuario?.area || '—'}`;
    if (cargoP) cargoP.innerHTML = `<strong>Cargo:</strong> ${usuario?.cargo || '—'}`;
    if (jornadaP) jornadaP.innerHTML = `<strong>Jornada:</strong> ${usuario?.jornada ?? '—'} horas`;
    if (tempoCasaP) tempoCasaP.innerHTML = `<strong>Ativo desde:</strong> ${formatDataInicio(usuario?.criadoEm)}`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const usuario = getUsuarioLogado();
  if (usuario) {
    popularPerfil(usuario);
  }
});
