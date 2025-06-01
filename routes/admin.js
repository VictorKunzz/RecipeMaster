const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

// --- Middleware de Verificação de Login de Admin (Padrão mflix) ---
function verificarLoginAdmin(req, res, next) {
    // Usando variáveis globais como no mflix
    if (!global.adminId) { // Verifica se o admin está logado
        return res.redirect("/admin"); // Redireciona para a página de login do admin
    }
    next(); // Continua para a próxima rota/middleware se logado como admin
}

// --- Rotas GET Admin ---

/* GET /admin (Página de Login do Admin) */
router.get("/", function(req, res, next) {
    // Se já estiver logado como admin, redireciona para o dashboard
    if (global.adminId) {
        return res.redirect("/admin/dashboard");
    }
    res.render("admin/login", { titulo: "RecipeMaster - Admin Login", mensagem: null, sucesso: null });
});

/* GET /admin/dashboard */
router.get("/dashboard", verificarLoginAdmin, async function(req, res, next) {
    try {
        const estatisticas = await global.banco.adminBuscarEstatisticas();
        res.render("admin/dashboard", {
            titulo: "RecipeMaster - Admin Dashboard",
            adminNome: global.adminNome,
            stats: estatisticas,
            mensagem: req.query.mensagem,
            sucesso: req.query.sucesso
        });
    } catch (error) {
        console.error("Erro ao carregar dashboard admin:", error);
        next(error);
    }
});

/* GET /admin/usuarios */
router.get("/usuarios", verificarLoginAdmin, async function(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const { usuarios, total } = await global.banco.adminBuscarTodosUsuarios(page, limit);
        const totalPages = Math.ceil(total / limit);

        res.render("admin/usuarios", {
            titulo: "RecipeMaster - Gerir Usuários",
            adminNome: global.adminNome,
            usuarios: usuarios,
            currentPage: page,
            totalPages: totalPages,
            mensagem: req.query.mensagem,
            sucesso: req.query.sucesso
        });
    } catch (error) {
        console.error("Erro ao buscar usuários admin:", error);
        next(error);
    }
});

/* GET /admin/categorias */
router.get("/categorias", verificarLoginAdmin, async function(req, res, next) {
    try {
        const categorias = await global.banco.buscarTodasCategorias();
        res.render("admin/categorias", {
            titulo: "RecipeMaster - Gerir Categorias",
            adminNome: global.adminNome,
            categorias: categorias,
            mensagem: req.query.mensagem,
            sucesso: req.query.sucesso
        });
    } catch (error) {
        console.error("Erro ao buscar categorias admin:", error);
        next(error);
    }
});

/* GET /admin/receitas-pendentes */
router.get("/receitas-pendentes", verificarLoginAdmin, async function(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const { receitas, total } = await global.banco.adminBuscarReceitasPendentes(page, limit);
        const totalPages = Math.ceil(total / limit);

        res.render("admin/receitas_pendentes", { // Assume que existe uma view admin/receitas_pendentes.ejs
            titulo: "RecipeMaster - Aprovar Receitas",
            adminNome: global.adminNome,
            receitas: receitas,
            currentPage: page,
            totalPages: totalPages,
            mensagem: req.query.mensagem,
            sucesso: req.query.sucesso
        });
    } catch (error) {
        console.error("Erro ao buscar receitas pendentes admin:", error);
        next(error);
    }
});

/* GET /admin/logout */
router.get("/logout", function(req, res, next) {
    // Limpa as variáveis globais de sessão do admin
    delete global.adminId;
    delete global.adminNome;
    res.redirect("/admin"); // Redireciona para a página de login do admin
});

// --- Rotas POST Admin ---

/* POST /admin/login */
router.post("/login", async function(req, res, next) {
    const email = req.body.email;
    const senha = req.body.senha;

    if (!email || !senha) {
        return res.render("admin/login", { titulo: "RecipeMaster - Admin Login", mensagem: "Email e senha são obrigatórios.", sucesso: false });
    }

    try {
        // Busca o usuário pelo email
        const usuario = await global.banco.buscarUsuarioPorEmailSenha(email, null);

        if (!usuario || !usuario.is_admin) { // Verifica se existe e se é admin
            return res.render("admin/login", { titulo: "RecipeMaster - Admin Login", mensagem: "Credenciais de administrador inválidas.", sucesso: false });
        }

        // Compara a senha fornecida com o hash armazenado
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.render("admin/login", { titulo: "RecipeMaster - Admin Login", mensagem: "Credenciais de administrador inválidas.", sucesso: false });
        }

        // Login de admin bem-sucedido: Define variáveis globais
        global.adminId = usuario.id;
        global.adminNome = usuario.nome;
        // Também define as variáveis de usuário normal para consistência, se necessário
        global.usuarioId = usuario.id;
        global.usuarioNome = usuario.nome;
        global.usuarioIsAdmin = true;

        res.redirect("/admin/dashboard"); // Redireciona para o dashboard do admin

    } catch (error) {
        console.error("Erro no login admin:", error);
        res.render("admin/login", { titulo: "RecipeMaster - Admin Login", mensagem: "Ocorreu um erro durante o login. Tente novamente.", sucesso: false });
    }
});

/* POST /admin/categorias/nova */
router.post("/categorias/nova", verificarLoginAdmin, async function(req, res, next) {
    const { nome } = req.body;
    let mensagem = "";
    let sucesso = false;

    if (!nome) {
        mensagem = "O nome da categoria é obrigatório.";
    } else {
        try {
            const existente = await global.banco.buscarCategoriaPorNome(nome);
            if (existente) {
                mensagem = "Categoria já existe.";
            } else {
                await global.banco.inserirCategoria(nome);
                mensagem = "Categoria criada com sucesso!";
                sucesso = true;
            }
        } catch (error) {
            console.error("Erro ao criar categoria:", error);
            mensagem = "Erro ao criar categoria.";
        }
    }
    res.redirect(`/admin/categorias?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
});

/* POST /admin/categorias/editar/:id */
router.post("/categorias/editar/:id", verificarLoginAdmin, async function(req, res, next) {
    const id = parseInt(req.params.id);
    const { nome } = req.body;
    let mensagem = "";
    let sucesso = false;

    if (!nome) {
        mensagem = "O nome da categoria é obrigatório.";
    } else {
        try {
            const categoriaAtual = await global.banco.buscarCategoriaPorId(id);
            if (!categoriaAtual) {
                mensagem = "Categoria não encontrada.";
            } else {
                const existente = await global.banco.buscarCategoriaPorNome(nome);
                // Permite salvar se o nome não mudou ou se o novo nome não pertence a outra categoria
                if (existente && existente.id !== id) {
                    mensagem = "Outra categoria já existe com este nome.";
                } else {
                    await global.banco.atualizarCategoria(id, nome);
                    mensagem = "Categoria atualizada com sucesso!";
                    sucesso = true;
                }
            }
        } catch (error) {
            console.error("Erro ao editar categoria:", error);
            mensagem = "Erro ao editar categoria.";
        }
    }
    // Idealmente, redirecionaria para uma página de edição com a mensagem,
    // mas para simplificar, redireciona para a lista.
    res.redirect(`/admin/categorias?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
});

/* POST /admin/categorias/excluir/:id */
router.post("/categorias/excluir/:id", verificarLoginAdmin, async function(req, res, next) {
    const id = parseInt(req.params.id);
    let mensagem = "";
    let sucesso = false;

    try {
        // O banco de dados (ON DELETE RESTRICT) deve impedir a exclusão se houver receitas.
        // Poderíamos adicionar uma verificação explícita aqui se quiséssemos uma mensagem mais amigável.
        const result = await global.banco.excluirCategoria(id);
        if (result.affectedRows > 0) {
            mensagem = "Categoria excluída com sucesso!";
            sucesso = true;
        } else {
            mensagem = "Categoria não encontrada.";
        }
    } catch (error) {
        console.error("Erro ao excluir categoria:", error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') { // Código de erro MySQL para FK constraint
            mensagem = "Erro: Não é possível excluir a categoria pois existem receitas associadas a ela.";
        } else {
            mensagem = "Erro ao excluir categoria.";
        }
    }
    res.redirect(`/admin/categorias?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
});

/* POST /admin/usuarios/excluir/:id */
router.post("/usuarios/excluir/:id", verificarLoginAdmin, async function(req, res, next) {
    const id = parseInt(req.params.id);
    let mensagem = "";
    let sucesso = false;

    if (id === global.adminId) { // Impede que o admin se auto-exclua
        mensagem = "Não pode excluir a sua própria conta de administrador.";
    } else {
        try {
            // TODO: Considerar o que fazer com as receitas/avaliações do usuário excluído.
            // O banco está configurado com ON DELETE CASCADE para avaliações/favoritos.
            // Para receitas, está ON DELETE CASCADE, o que significa que as receitas do usuário serão excluídas.
            // Se a intenção for manter as receitas, altere a FK para ON DELETE SET NULL e trate autor_id nulo.
            const result = await global.banco.adminExcluirUsuario(id);
            if (result.affectedRows > 0) {
                mensagem = "Usuário excluído com sucesso!";
                sucesso = true;
            } else {
                mensagem = "Usuário não encontrado.";
            }
        } catch (error) {
            console.error("Erro ao excluir usuário:", error);
            mensagem = "Erro ao excluir usuário.";
        }
    }
    res.redirect(`/admin/usuarios?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
});

/* POST /admin/receitas/aprovar/:id */
router.post("/receitas/aprovar/:id", verificarLoginAdmin, async function(req, res, next) {
    const id = parseInt(req.params.id);
    let mensagem = "";
    let sucesso = false;

    try {
        const result = await global.banco.adminAprovarReceita(id);
        if (result.affectedRows > 0) {
            mensagem = "Receita aprovada com sucesso!";
            sucesso = true;
        } else {
            mensagem = "Receita não encontrada ou já aprovada.";
        }
    } catch (error) {
        console.error("Erro ao aprovar receita:", error);
        mensagem = "Erro ao aprovar receita.";
    }
    res.redirect(`/admin/receitas-pendentes?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
});

/* POST /admin/receitas/excluir/:id */
// Adicionando rota para admin excluir qualquer receita (aprovada ou não)
router.post("/receitas/excluir/:id", verificarLoginAdmin, async function(req, res, next) {
    const id = parseInt(req.params.id);
    let mensagem = "";
    let sucesso = false;

    try {
        // Antes de excluir a receita, precisamos excluir as imagens associadas do sistema de ficheiros
        const receita = await global.banco.buscarReceitaPorId(id); // Busca para obter os paths das imagens
        if (receita && receita.imagens && receita.imagens.length > 0) {
            receita.imagens.forEach(imgPath => {
                const fullPath = path.join(__dirname, "../public", imgPath);
                fs.unlink(fullPath, (err) => {
                    if (err && err.code !== 'ENOENT') console.error(`Erro ao remover imagem ${fullPath}:`, err);
                });
            });
        }

        // Exclui a receita do banco (imagens_receita são excluídas em cascata)
        const result = await global.banco.excluirReceita(id);
        if (result.affectedRows > 0) {
            mensagem = "Receita excluída com sucesso!";
            sucesso = true;
        } else {
            mensagem = "Receita não encontrada.";
        }
    } catch (error) {
        console.error("Erro ao excluir receita (admin):", error);
        mensagem = "Erro ao excluir receita.";
    }
    // Redireciona para uma página relevante, talvez o dashboard ou a lista de pendentes
    res.redirect(`/admin/dashboard?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
});


module.exports = router;

