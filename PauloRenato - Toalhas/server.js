const express = require('express');
const { Pool } = require('pg'); // Conector do Supabase
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// A connection string do Supabase vem da variável de ambiente DATABASE_URL
// (configure em: Render > seu serviço > Environment > Add Environment Variable).
// Pegue o valor em: Supabase > Project Settings > Database > Connection String (URI)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERRO: variável de ambiente DATABASE_URL não foi definida. Configure-a no painel do Render (Environment) com a connection string do Supabase.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

console.log('Conectado ao Banco de Dados do Supabase na nuvem!');

// Colunas json/jsonb no Postgres já vêm parseadas pelo driver "pg".
// Colunas text/varchar vêm como string e precisam de JSON.parse.
// Essa função lida com os dois casos sem quebrar.
function parseMaybeJson(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch (e) { return fallback; }
    }
    return value;
}

// BUSCAR PRODUTOS
// ==========================================
// ROTAS DO CATÁLOGO DE TOALHAS
// ==========================================

// BUSCAR TOALHAS
app.get('/api/toalhas', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM toalhas ORDER BY ordem ASC, id DESC");
        const formatados = result.rows.map(p => {
            let parsedVariations = parseMaybeJson(p.variations, []);
            if (!Array.isArray(parsedVariations) || parsedVariations.length === 0) {
                parsedVariations = [{ size: 'Varejo', price: 0 }, { size: 'Atacado', price: 0 }];
            }
            return {
                id: p.id,
                name: p.name,
                desc: p.descricao,
                images: parseMaybeJson(p.images, []),
                availableTypes: parseMaybeJson(p.available_types ?? p.availableTypes, []),
                variations: parsedVariations,
                ordem: p.ordem || 0
            };
        });
        res.status(200).json(formatados);
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar toalhas." });
    }
});

// SALVAR OU ATUALIZAR TOALHA
app.post('/api/toalhas', async (req, res) => {
    const { id, name, desc, images, availableTypes, variations, ordem } = req.body;
    const imagesJson = JSON.stringify(images || []);
    const typesJson = JSON.stringify(availableTypes || []);
    const variationsJson = JSON.stringify(variations || []);
    const posicaoOrdem = ordem || 0;

    try {
        if (id) {
            const sql = `UPDATE toalhas SET name = $1, descricao = $2, images = $3, available_types = $4, variations = $5, ordem = $6 WHERE id = $7`;
            await pool.query(sql, [name, desc, imagesJson, typesJson, variationsJson, posicaoOrdem, id]);
            res.status(200).json({ message: "Toalha atualizada!" });
        } else {
            const sql = `INSERT INTO toalhas (name, descricao, images, available_types, variations, ordem) VALUES ($1, $2, $3, $4, $5, $6)`;
            await pool.query(sql, [name, desc, imagesJson, typesJson, variationsJson, posicaoOrdem]);
            res.status(201).json({ message: "Nova toalha adicionada!" });
        }
    } catch (err) {
        res.status(500).json({ message: "Erro ao salvar no banco." });
    }
});

// REORDENAR TOALHAS
app.post('/api/toalhas/reordenar', async (req, res) => {
    const { listaOrdem } = req.body;
    if (!listaOrdem || !Array.isArray(listaOrdem)) return res.sendStatus(200);

    try {
        for (const item of listaOrdem) {
            await pool.query("UPDATE toalhas SET ordem = $1 WHERE id = $2", [item.ordem, item.id]);
        }
        res.status(200).json({ message: "Ordem atualizada!" });
    } catch (err) {
        res.status(500).json({ message: "Erro ao reordenar." });
    }
});

// DELETAR TOALHA
app.delete('/api/toalhas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM toalhas WHERE id = $1", [id]);
        res.status(200).json({ message: "Excluída!" });
    } catch (err) {
        res.status(500).json({ message: "Erro ao deletar." });
    }
});

// ADICIONE ESTA ROTA DE LOGIN NO SEU SERVER.JS
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Usuário e senha para acessar o modo admin
    const USUARIO_ADMIN = "Paulo Renato";
    const SENHA_ADMIN = "paulo123";

    if (username === USUARIO_ADMIN && password === SENHA_ADMIN) {
        return res.status(200).json({ message: "Login realizado com sucesso!" });
    } else {
        return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }
});

// SALVAR OU ATUALIZAR
app.post('/api/produtos', async (req, res) => {
    const { id, name, desc, images, availableTypes, variations, ordem } = req.body;
    const imagesJson = JSON.stringify(images || []);
    const typesJson = JSON.stringify(availableTypes || []);
    const variationsJson = JSON.stringify(variations || []);
    const posicaoOrdem = ordem || 0;

    try {
        if (id) {
            const sql = `UPDATE produtos SET name = $1, descricao = $2, images = $3, available_types = $4, variations = $5, ordem = $6 WHERE id = $7`;
            await pool.query(sql, [name, desc, imagesJson, typesJson, variationsJson, posicaoOrdem, id]);
            res.status(200).json({ message: "Alterações salvas!" });
        } else {
            const sql = `INSERT INTO produtos (name, descricao, images, available_types, variations, ordem) VALUES ($1, $2, $3, $4, $5, $6)`;
            await pool.query(sql, [name, desc, imagesJson, typesJson, variationsJson, posicaoOrdem]);
            res.status(201).json({ message: "Novo produto adicionado!" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao salvar no banco." });
    }
});

// REORDENAR
app.post('/api/produtos/reordenar', async (req, res) => {
    const { listaOrdem } = req.body;
    if (!listaOrdem || !Array.isArray(listaOrdem)) return res.sendStatus(200);

    try {
        for (const item of listaOrdem) {
            await pool.query("UPDATE produtos SET ordem = $1 WHERE id = $2", [item.ordem, item.id]);
        }
        res.status(200).json({ message: "Ordem atualizada!" });
    } catch (err) {
        res.status(500).json({ message: "Erro ao reordenar." });
    }
});

// DELETAR PRODUTO
app.delete('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM produtos WHERE id = $1", [id]);
        res.status(200).json({ message: "Excluído!" });
    } catch (err) {
        res.status(500).json({ message: "Erro ao deletar." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor online na porta ${PORT}`));