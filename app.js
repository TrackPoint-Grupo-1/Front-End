const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const axios = require('axios');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

app.get('/api/usuarios', async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/usuarios`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do backend Kotlin' });
  }
});

app.listen(PORT, () => {
  console.log(`Front-end rodando em http://localhost:${PORT}`);
});