const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const bodyParser = require('body-parser'); // Para ler o corpo da requisição

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// Serve a página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve a página de login
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve a página de login
app.get('/system/home.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '/system/home.html'));
});

// Serve as páginas do dashboard do gestor
app.get('/manager/visao-geral', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '/manager/visao-geral.html'));
});

app.get('/manager/horas-extras', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '/manager/horas-extras.html'));
});

app.get('/manager/horas-projeto', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '/manager/horas-projeto.html'));
});

// Serve a página de relatório de horas
app.get('/relatorio-horas', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '/relatorio-horas.html'));
});

// Rota para login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    // Chamada ao backend Kotlin para verificar as credenciais usando o endpoint correto
    const response = await axios.get(`${BACKEND_URL}/usuarios/preLogin`, {
      headers: {
        'email': email,
        'senha': senha
      }
    });

    if (response.data) {
      // Se a autenticação for bem-sucedida, retorna os dados do usuário
      res.json({ 
        message: 'Login bem-sucedido!', 
        usuario: response.data 
      });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas.' });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    if (error.response && error.response.status === 401) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
    } else {
      res.status(500).json({ error: 'Erro ao realizar login.' });
    }
  }
});

// Rota para obter usuários
app.get('/api/usuarios', async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/usuarios`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do backend Kotlin' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Front-end rodando em http://localhost:${PORT}`);
});
