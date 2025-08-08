axios.get('/api/usuarios')
  .then(response => {
    const lista = document.getElementById('lista-usuarios');
    response.data.forEach(usuario => {
      const li = document.createElement('li');
      li.textContent = usuario.nome;
      lista.appendChild(li);
    });
  })
  .catch(error => {
    console.error('Erro ao buscar usuários:', error);
  });