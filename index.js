require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');


const app = express();

const corsOptions = {
  origin: "https://transporte-executivo.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("/*", cors(corsOptions)); // habilita preflight
app.use(express.json());


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Função para criar tabela e inserir dados iniciais
async function initializeDatabase() {
  // Cria tabela se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      whatsapp VARCHAR(50),
      email VARCHAR(255),
      cpf VARCHAR(20),
      origem VARCHAR(255),
      endereco VARCHAR(255),
      cidadeEstado VARCHAR(255)
    )
  `);

  // Insere um cliente exemplo se a tabela estiver vazia
  const result = await pool.query('SELECT COUNT(*) FROM clientes');
  if (parseInt(result.rows[0].count, 10) === 0) {
    await pool.query(
      `INSERT INTO clientes (nome, whatsapp, email, cpf, origem, endereco, cidadeEstado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'Cliente Exemplo',
        '11999999999',
        'exemplo@email.com',
        '123.456.789-00',
        'Indicação',
        'Rua Exemplo, 123',
        'São Paulo/SP'
      ]
    );
  }
}


// Rotas de clientes
app.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

app.post('/clientes', async (req, res) => {
  const { nome, whatsapp, email, cpf, origem, endereco, cidadeEstado } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nome, whatsapp, email, cpf, origem, endereco, cidadeEstado) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nome, whatsapp, email, cpf, origem, endereco, cidadeEstado]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

app.put('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, whatsapp, email, cpf, origem, endereco, cidadeEstado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clientes SET nome=$1, whatsapp=$2, email=$3, cpf=$4, origem=$5, endereco=$6, cidadeEstado=$7 WHERE id=$8 RETURNING *',
      [nome, whatsapp, email, cpf, origem, endereco, cidadeEstado, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

app.delete('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clientes WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});

app.get('/', (req, res) => res.send('API online!'));

const port = process.env.PORT || 3001;
initializeDatabase()
  .then(() => {
    app.listen(port, () => console.log('Servidor rodando na porta', port));
  })
  .catch((err) => {
    console.error('Erro ao inicializar o banco de dados:', err);
    process.exit(1);
  });