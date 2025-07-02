require("dotenv").config(); // Carrega variáveis de ambiente do .env
const mysql = require("mysql2/promise");

// Configuração da pool de conexões
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root", // Use variáveis de ambiente para segurança
    password: process.env.DB_PASSWORD || "", // Use variáveis de ambiente
    database: process.env.DB_NAME || "RecipeMaster",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log("MySQL Pool criada.");

// Função genérica para executar queries
async function query(sql, params) {
    const [results, ] = await pool.execute(sql, params);
    return results;
}

// --- Funções de Autenticação e Usuário ---

async function buscarUsuarioPorEmailSenha(email, senha) {
    // IMPORTANTE: A comparação de senha deve ser feita na aplicação após buscar o usuário pelo email
    // O bcrypt.compare deve ser usado aqui. Esta função apenas busca pelo email.
    console.log(`Buscando usuário com email: ${email}`);
    const results = await query("SELECT id, nome, email, senha, is_admin FROM usuarios WHERE email = ?", [email]);
    console.log("Resultado da busca por email:", results);
    return results[0]; // Retorna o primeiro usuário encontrado ou undefined
}

async function buscarUsuarioPorId(id) {
    const results = await query("SELECT id, nome, email, telefone, data_nascimento, sobre, foto_perfil_path, foto_capa_path, is_admin, data_criacao FROM usuarios WHERE id = ?", [id]);
    return results[0];
}

async function inserirUsuario(nome, email, senhaHash) {
    const result = await query("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)", [nome, email, senhaHash]);
    return result.insertId;
}

async function atualizarPerfilUsuario(id, nome, email, telefone, data_nascimento, sobre, foto_perfil_path, foto_capa_path) {
    // Constrói a query dinamicamente para atualizar apenas os campos fornecidos
    let sql = "UPDATE usuarios SET ";
    const params = [];
    const fieldsToUpdate = [];

    if (nome !== undefined) { fieldsToUpdate.push("nome = ?"); params.push(nome); }
    if (email !== undefined) { fieldsToUpdate.push("email = ?"); params.push(email); }
    if (telefone !== undefined) { fieldsToUpdate.push("telefone = ?"); params.push(telefone); }
    if (data_nascimento !== undefined) { fieldsToUpdate.push("data_nascimento = ?"); params.push(data_nascimento); }
    if (sobre !== undefined) { fieldsToUpdate.push("sobre = ?"); params.push(sobre); }
    if (foto_perfil_path !== undefined) { fieldsToUpdate.push("foto_perfil_path = ?"); params.push(foto_perfil_path); }
    if (foto_capa_path !== undefined) { fieldsToUpdate.push("foto_capa_path = ?"); params.push(foto_capa_path); }

    if (fieldsToUpdate.length === 0) {
        return { affectedRows: 0 }; // Nada para atualizar
    }

    sql += fieldsToUpdate.join(", ") + " WHERE id = ?";
    params.push(id);

    const result = await query(sql, params);
    return result;
}

async function atualizarSenhaUsuario(id, novaSenhaHash) {
    const result = await query("UPDATE usuarios SET senha = ? WHERE id = ?", [novaSenhaHash, id]);
    return result;
}

// --- Funções de Receitas ---

async function buscarTodasReceitasAprovadas(page = 1, limit = 10, search = null, categoryId = null) {
    let sql = `SELECT r.id, r.titulo, r.descricao, r.tempo_preparo, r.rendimento, r.data_criacao, c.nome as categoria_nome, u.nome as autor_nome, GROUP_CONCAT(ir.imagem_path) as imagens
               FROM receitas r
               JOIN categorias c ON r.categoria_id = c.id
               JOIN usuarios u ON r.autor_id = u.id
               LEFT JOIN imagens_receita ir ON r.id = ir.receita_id
               WHERE r.is_aprovado = 1`;
    const params = [];

    if (search) {
        sql += " AND (r.titulo LIKE ? OR r.descricao LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }
    if (categoryId) {
        sql += " AND r.categoria_id = ?";
        params.push(categoryId);
    }

    const offset = (page - 1) * limit;
    sql += ` GROUP BY r.id ORDER BY r.data_criacao DESC LIMIT ${limit} OFFSET ${offset}`;

    const receitas = await query(sql, params);
    // Processar imagens para serem arrays
    receitas.forEach(r => { r.imagens = r.imagens ? r.imagens.split(",") : []; });

    // Contar total para paginação (considerando filtros)
    let countSql = "SELECT COUNT(DISTINCT r.id) as total FROM receitas r WHERE r.is_aprovado = 1";
    const countParams = [];
    if (search) {
        countSql += " AND (r.titulo LIKE ? OR r.descricao LIKE ?)";
        countParams.push(`%${search}%`, `%${search}%`);
    }
    if (categoryId) {
        countSql += " AND r.categoria_id = ?";
        countParams.push(categoryId);
    }
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    return { receitas, total, page, limit };
}

async function buscarReceitaPorId(id) {
    const sql = `SELECT r.*, c.nome as categoria_nome, u.nome as autor_nome, u.foto_perfil_path as autor_foto
                 FROM receitas r
                 JOIN categorias c ON r.categoria_id = c.id
                 JOIN usuarios u ON r.autor_id = u.id
                 WHERE r.id = ?`;
    const results = await query(sql, [id]);
    if (!results[0]) return null;

    const receita = results[0];

    // Buscar imagens associadas
    const imagens = await query("SELECT imagem_path FROM imagens_receita WHERE receita_id = ?", [id]);
    receita.imagens = imagens.map(img => img.imagem_path);

    // Buscar avaliações associadas
    const avaliacoes = await buscarAvaliacoesPorReceitaId(id);
    receita.avaliacoes = avaliacoes;

    return receita;
}

async function inserirReceita(titulo, descricao, tempo_preparo, rendimento, ingredientes, modo_preparo, autor_id, categoria_id, is_aprovado = false) {
    const result = await query(
        "INSERT INTO receitas (titulo, descricao, tempo_preparo, rendimento, ingredientes, modo_preparo, autor_id, categoria_id, is_aprovado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [titulo, descricao, tempo_preparo, rendimento, ingredientes, modo_preparo, autor_id, categoria_id, is_aprovado]
    );
    return result.insertId;
}

async function inserirImagemReceita(receita_id, imagem_path) {
    await query("INSERT INTO imagens_receita (receita_id, imagem_path) VALUES (?, ?)", [receita_id, imagem_path]);
}

async function removerImagensReceita(receita_id) {
    // TODO: Obter os paths antes de deletar para poder apagar os ficheiros
    await query("DELETE FROM imagens_receita WHERE receita_id = ?", [receita_id]);
}

async function atualizarReceita(id, titulo, descricao, tempo_preparo, rendimento, ingredientes, modo_preparo, categoria_id, is_aprovado) {
    let sql = "UPDATE receitas SET ";
    const params = [];
    const fieldsToUpdate = [];

    if (titulo !== undefined) { fieldsToUpdate.push("titulo = ?"); params.push(titulo); }
    if (descricao !== undefined) { fieldsToUpdate.push("descricao = ?"); params.push(descricao); }
    if (tempo_preparo !== undefined) { fieldsToUpdate.push("tempo_preparo = ?"); params.push(tempo_preparo); }
    if (rendimento !== undefined) { fieldsToUpdate.push("rendimento = ?"); params.push(rendimento); }
    if (ingredientes !== undefined) { fieldsToUpdate.push("ingredientes = ?"); params.push(ingredientes); }
    if (modo_preparo !== undefined) { fieldsToUpdate.push("modo_preparo = ?"); params.push(modo_preparo); }
    if (categoria_id !== undefined) { fieldsToUpdate.push("categoria_id = ?"); params.push(categoria_id); }
    if (is_aprovado !== undefined) { fieldsToUpdate.push("is_aprovado = ?"); params.push(is_aprovado); }

    if (fieldsToUpdate.length === 0) {
        return { affectedRows: 0 }; // Nada para atualizar
    }

    sql += fieldsToUpdate.join(", ") + " WHERE id = ?";
    params.push(id);

    const result = await query(sql, params);
    return result;
}

async function excluirReceita(id) {
    // As imagens associadas são excluídas em cascata (ON DELETE CASCADE)
    const result = await query("DELETE FROM receitas WHERE id = ?", [id]);
    return result;
}

async function buscarReceitasPorAutor(autor_id) {
    const sql = `SELECT r.id, r.titulo, r.descricao, r.is_aprovado, r.data_criacao, c.nome as categoria_nome, GROUP_CONCAT(ir.imagem_path) as imagens
                 FROM receitas r
                 JOIN categorias c ON r.categoria_id = c.id
                 LEFT JOIN imagens_receita ir ON r.id = ir.receita_id
                 WHERE r.autor_id = ?
                 GROUP BY r.id ORDER BY r.data_criacao DESC`;
    const receitas = await query(sql, [autor_id]);
    receitas.forEach(r => { r.imagens = r.imagens ? r.imagens.split(",") : []; });
    return receitas;
}

// --- Funções de Categorias ---

async function buscarTodasCategorias() {
    return await query("SELECT id, nome FROM categorias ORDER BY nome ASC");
}

async function buscarCategoriaPorId(id) {
    const results = await query("SELECT id, nome FROM categorias WHERE id = ?", [id]);
    return results[0];
}

async function buscarCategoriaPorNome(nome) {
    const results = await query("SELECT id, nome FROM categorias WHERE nome = ?", [nome]);
    return results[0];
}

async function inserirCategoria(nome) {
    const result = await query("INSERT INTO categorias (nome) VALUES (?)", [nome]);
    return result.insertId;
}

async function atualizarCategoria(id, nome) {
    const result = await query("UPDATE categorias SET nome = ? WHERE id = ?", [nome, id]);
    return result;
}

async function excluirCategoria(id) {
    // Adicionar verificação se a categoria está em uso antes de excluir?
    // A FK na tabela receitas está como ON DELETE RESTRICT, então o SGBD impedirá.
    const result = await query("DELETE FROM categorias WHERE id = ?", [id]);
    return result;
}

// --- Funções de Avaliações ---

async function inserirAvaliacao(nota, comentario, autor_id, receita_id) {
    const result = await query(
        "INSERT INTO avaliacoes (nota, comentario, autor_id, receita_id) VALUES (?, ?, ?, ?)",
        [nota, comentario, autor_id, receita_id]
    );
    return result.insertId;
}

async function buscarAvaliacoesPorReceitaId(receita_id) {
    const sql = `SELECT a.id, a.nota, a.comentario, a.data_criacao, u.nome as autor_nome, u.foto_perfil_path as autor_foto
                 FROM avaliacoes a
                 JOIN usuarios u ON a.autor_id = u.id
                 WHERE a.receita_id = ?
                 ORDER BY a.data_criacao DESC`;
    return await query(sql, [receita_id]);
}

async function excluirAvaliacao(id) {
    const result = await query("DELETE FROM avaliacoes WHERE id = ?", [id]);
    return result;
}

// --- Funções de Favoritos ---

async function adicionarFavorito(usuario_id, receita_id) {
    try {
        await query("INSERT INTO favoritos (usuario_id, receita_id) VALUES (?, ?)", [usuario_id, receita_id]);
        return true;
    } catch (error) {
        // Ignora erro de chave duplicada (já é favorito)
        if (error.code === 'ER_DUP_ENTRY') {
            return false;
        }
        throw error; // Re-lança outros erros
    }
}

async function removerFavorito(usuario_id, receita_id) {
    const result = await query("DELETE FROM favoritos WHERE usuario_id = ? AND receita_id = ?", [usuario_id, receita_id]);
    return result.affectedRows > 0;
}

async function buscarFavoritosPorUsuarioId(usuario_id) {
    const sql = `SELECT r.id, r.titulo, r.descricao, c.nome as categoria_nome, GROUP_CONCAT(ir.imagem_path) as imagens
                 FROM favoritos f
                 JOIN receitas r ON f.receita_id = r.id
                 JOIN categorias c ON r.categoria_id = c.id
                 LEFT JOIN imagens_receita ir ON r.id = ir.receita_id
                 WHERE f.usuario_id = ? AND r.is_aprovado = TRUE
                 GROUP BY r.id ORDER BY f.data_adicao DESC`;
    const receitas = await query(sql, [usuario_id]);
    receitas.forEach(r => { r.imagens = r.imagens ? r.imagens.split(",") : []; });
    return receitas;
}

async function verificarFavorito(usuario_id, receita_id) {
    const results = await query("SELECT 1 FROM favoritos WHERE usuario_id = ? AND receita_id = ?", [usuario_id, receita_id]);
    return results.length > 0;
}

// --- Funções de Administração ---

async function adminBuscarTodosUsuarios(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const usuarios = await query("SELECT id, nome, email, is_admin, data_criacao FROM usuarios ORDER BY data_criacao DESC LIMIT ? OFFSET ?", [limit, offset]);
    const totalResult = await query("SELECT COUNT(*) as total FROM usuarios");
    const total = totalResult[0].total;
    return { usuarios, total, page, limit };
}

async function adminExcluirUsuario(id) {
    // Adicionar lógica para lidar com receitas/avaliações do usuário, se necessário
    const result = await query("DELETE FROM usuarios WHERE id = ?", [id]);
    return result;
}

async function adminBuscarReceitasPendentes(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const receitas = await query(`
        SELECT r.id, r.titulo, r.data_criacao, u.nome as autor_nome, c.nome as categoria_nome,
               GROUP_CONCAT(ir.imagem_path) as imagens
        FROM receitas r
        JOIN usuarios u ON r.autor_id = u.id
        JOIN categorias c ON r.categoria_id = c.id
        LEFT JOIN imagens_receita ir ON r.id = ir.receita_id
        WHERE r.is_aprovado = FALSE
        GROUP BY r.id
        ORDER BY r.data_criacao ASC LIMIT ? OFFSET ?`, [limit, offset]);
    
    // Processa as imagens
    receitas.forEach(r => { 
        r.imagens = r.imagens ? r.imagens.split(",") : []; 
    });
    
    const totalResult = await query("SELECT COUNT(*) as total FROM receitas WHERE is_aprovado = FALSE");
    const total = totalResult[0].total;
    return { receitas, total, page, limit };
}

async function adminAprovarReceita(id) {
    const result = await query("UPDATE receitas SET is_aprovado = TRUE WHERE id = ?", [id]);
    return result;
}

async function adminBuscarEstatisticas() {
    const [totalUsuarios] = await query("SELECT COUNT(*) as count FROM usuarios");
    const [totalReceitas] = await query("SELECT COUNT(*) as count FROM receitas");
    const [receitasPendentes] = await query("SELECT COUNT(*) as count FROM receitas WHERE is_aprovado = FALSE");
    const [totalCategorias] = await query("SELECT COUNT(*) as count FROM categorias");

    return {
        totalUsuarios: totalUsuarios.count,
        totalReceitas: totalReceitas.count,
        receitasPendentes: receitasPendentes.count,
        totalCategorias: totalCategorias.count
    };
}


module.exports = {
    query,
    // Usuário
    buscarUsuarioPorEmailSenha,
    buscarUsuarioPorId,
    inserirUsuario,
    atualizarPerfilUsuario,
    atualizarSenhaUsuario,
    // Receitas
    buscarTodasReceitasAprovadas,
    buscarReceitaPorId,
    inserirReceita,
    inserirImagemReceita,
    removerImagensReceita,
    atualizarReceita,
    excluirReceita,
    buscarReceitasPorAutor,
    // Categorias
    buscarTodasCategorias,
    buscarCategoriaPorId,
    buscarCategoriaPorNome,
    inserirCategoria,
    atualizarCategoria,
    excluirCategoria,
    // Avaliações
    inserirAvaliacao,
    buscarAvaliacoesPorReceitaId,
    excluirAvaliacao,
    // Favoritos
    adicionarFavorito,
    removerFavorito,
    buscarFavoritosPorUsuarioId,
    verificarFavorito,
    // Admin
    adminBuscarTodosUsuarios,
    adminExcluirUsuario,
    adminBuscarReceitasPendentes,
    adminAprovarReceita,
    adminBuscarEstatisticas
};

