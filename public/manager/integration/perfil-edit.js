import { put } from '../../integration/connection.js';

function getUsuarioLogado() {
  try {
    const raw = localStorage.getItem('usuarioLogado');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function openModal() {
  const modal = document.getElementById('modal-editar-perfil');
  if (modal) modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('modal-editar-perfil');
  if (modal) modal.classList.add('hidden');
}

function setFeedback(message, isError = true) {
  const el = document.getElementById('editar-feedback');
  if (!el) return;
  el.textContent = message || '';
  el.style.color = isError ? '#c53030' : '#2f855a';
}

function buildPayload(nome, email, senhaNova, senhaNovaConfirmar) {
  const payload = {};
  if (nome && nome.trim().length > 0) payload.nome = nome.trim();
  if (email && email.trim().length > 0) payload.email = email.trim();
  if (senhaNova || senhaNovaConfirmar) {
    if (!senhaNova) {
      throw new Error('Informe a nova senha.');
    }
    if (senhaNova !== senhaNovaConfirmar) {
      throw new Error('A confirmação da nova senha não confere.');
    }
    payload.senha = senhaNova;
  }
  return payload;
}

function hydrateInitialValues() {
  // opcional: preencher com os valores atuais presentes na página
  const nomeEl = document.querySelector('.usuario-nome');
  const emailText = document.querySelector('.info-lista p:nth-child(1)');
  const inputNome = document.getElementById('campo-nome');
  const inputEmail = document.getElementById('campo-email');
  if (inputNome && nomeEl) inputNome.value = nomeEl.textContent || '';
  if (inputEmail && emailText) {
    const txt = emailText.textContent || '';
    const match = txt.split(':');
    inputEmail.value = match.length > 1 ? match[1].trim() : '';
  }
}

function attachEvents() {
  const btnEdit = document.querySelector('.btn-edit');
  const btnClose = document.getElementById('close-modal');
  const btnCancel = document.getElementById('cancelar-edicao');
  const form = document.getElementById('form-editar-perfil');

  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      openModal();
      setFeedback('');
      hydrateInitialValues();
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFeedback('');

      const usuario = getUsuarioLogado();
      if (!usuario || !usuario.id) {
        setFeedback('Usuário não encontrado no armazenamento local.', true);
        return;
      }

      const id = usuario.id;
      const nome = document.getElementById('campo-nome')?.value || '';
      const email = document.getElementById('campo-email')?.value || '';
      const senhaNova = document.getElementById('senha-nova')?.value || '';
      const senhaNovaConfirmar = document.getElementById('senha-nova-confirmar')?.value || '';

      let payload;
      try {
        payload = buildPayload(nome, email, senhaNova, senhaNovaConfirmar);
      } catch (err) {
        setFeedback(err.message || 'Verifique os campos informados.', true);
        return;
      }

      if (Object.keys(payload).length === 0) {
        setFeedback('Informe ao menos um campo para atualizar.', true);
        return;
      }

      try {
        const result = await put(`/usuarios/${id}`, payload);
        setFeedback('Dados atualizados com sucesso!', false);
        // opcional: refletir mudanças na interface
        if (payload.nome) {
          const nomeEl = document.querySelector('.usuario-nome');
          if (nomeEl) nomeEl.textContent = payload.nome;
        }
        if (payload.email) {
          const emailText = document.querySelector('.info-lista p:nth-child(1)');
          if (emailText) emailText.innerHTML = `<strong>Email:</strong> ${payload.email}`;
        }
        // limpar campos de senha
        const sn = document.getElementById('senha-nova');
        const snc = document.getElementById('senha-nova-confirmar');
        if (sn) sn.value = '';
        if (snc) snc.value = '';
        // fecha após breve intervalo
        setTimeout(closeModal, 800);
      } catch (err) {
        setFeedback(err.message || 'Falha ao atualizar dados.', true);
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', attachEvents);
