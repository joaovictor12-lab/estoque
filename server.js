// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
const path = require('path');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicializa o banco de dados SQLite
const db = new sqlite3.Database('./estoque.db', (err) => {
    if (err) console.error(err.message);
    console.log('Conectado ao banco de dados de estoque.');
});

// Criação das Tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS variacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        modelo TEXT,
        tamanho TEXT,
        quantidade INTEGER,
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    )`);
});

// Rota para cadastrar um novo produto com sua variação
app.post('/api/estoque', (req, res) => {
    const { nome, modelo, tamanho, quantidade } = req.body;

    // Primeiro, verifica se o produto já existe
    db.get(`SELECT id FROM produtos WHERE nome = ?`, [nome], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let produto_id;

        if (row) {
            // Produto existe, usa o ID existente
            produto_id = row.id;
            inserirVariacao(produto_id, modelo, tamanho, quantidade, res);
        } else {
            // Produto não existe, cria um novo
            db.run(`INSERT INTO produtos (nome) VALUES (?)`, [nome], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                produto_id = this.lastID;
                inserirVariacao(produto_id, modelo, tamanho, quantidade, res);
            });
        }
    });
});

function inserirVariacao(produto_id, modelo, tamanho, quantidade, res) {
    db.run(
        `INSERT INTO variacoes (produto_id, modelo, tamanho, quantidade) VALUES (?, ?, ?, ?)`,
        [produto_id, modelo, tamanho, quantidade],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Estoque atualizado com sucesso!' });
        }
    );
}

// Rota para listar todo o estoque
app.get('/api/estoque', (req, res) => {
    const query = `
        SELECT p.nome, v.modelo, v.tamanho, v.quantidade 
        FROM variacoes v
        JOIN produtos p ON v.produto_id = p.id
        ORDER BY p.nome, v.tamanho
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ estoque: rows });
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});