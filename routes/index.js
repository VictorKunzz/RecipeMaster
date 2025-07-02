const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- Configuração do Multer para Uploads de Usuário ---
const userStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "../public/uploads/users");
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Apenas ficheiros de imagem são permitidos!"), false);
    }
};

const uploadUserImages = multer({
    storage: userStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB por ficheiro
}).fields([
    { name: "foto_perfil", maxCount: 1 },
    { name: "foto_capa", maxCount: 1 }
]);

// --- Configuração do Multer para Uploads de Receitas ---
const recipeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "../public/uploads/recipes");
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, "recipe-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadRecipeImages = multer({
    storage: recipeStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB por ficheiro
}).array("fotos", 5); // Aceita até 5 ficheiros no campo "fotos"


// --- Middleware de Verificação de Login (Padrão mflix) ---
function verificarLogin(req, res, next) {
    if (!global.usuarioId) {
        return res.redirect("/");
    }
    next();
}

// --- Rotas GET ---

/* GET home page (login) */
router.get("/", function(req, res, next) {
    if (global.usuarioId) {
        return res.redirect("/browse");
    }
    res.render("index", { titulo: "RecipeMaster - Login", mensagem: req.query.mensagem, sucesso: req.query.sucesso });
});

/* GET browse (página principal após login) */
router.get("/browse", verificarLogin, async function(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const search = req.query.search;
        const categoryId = req.query.categoria_id;
        const usuario = await global.banco.buscarUsuarioPorId(global.usuarioId); // Buscar dados do usuário para header

        const { receitas, total } = await global.banco.buscarTodasReceitasAprovadas(page, limit, search, categoryId);
        const categorias = await global.banco.buscarTodasCategorias();
        const totalPages = Math.ceil(total / limit);

        res.render("browse", {
            titulo: "RecipeMaster - Receitas",
            usuarioNome: global.usuarioNome,
            usuario: usuario, // Passar objeto usuário completo
            usuarioIsAdmin: global.usuarioIsAdmin,
            receitas: receitas,
            categorias: categorias,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            selectedCategoryId: categoryId,
            mensagem: req.query.mensagem,
            sucesso: req.query.sucesso
        });
    } catch (error) {
        console.error("Erro ao buscar receitas:", error);
        next(error);
    }
});

/* GET detalhes da receita */
router.get("/receita/:id", verificarLogin, async function(req, res, next) {
    try {
        const receitaId = parseInt(req.params.id);
        const receita = await global.banco.buscarReceitaPorId(receitaId);
        const usuario = await global.banco.buscarUsuarioPorId(global.usuarioId); // Buscar dados do usuário para header

        // Verifica se a receita existe
        if (!receita) {
            return res.status(404).render("error", { message: "Receita não encontrada.", error: { status: 404 } });
        }

        // Verifica se a receita está aprovada OU se o usuário logado é o autor OU se é admin
        const podeVer = receita.is_aprovado || (global.usuarioId === receita.autor_id) || global.usuarioIsAdmin;

        if (!podeVer) {
            return res.status(403).render("error", { message: "Receita não disponível ou pendente de aprovação.", error: { status: 403 } });
        }

        const isFavorito = await global.banco.verificarFavorito(global.usuarioId, receitaId);

        res.render("recipe_detail", {
            titulo: `RecipeMaster - ${receita.titulo}`,
            usuarioNome: global.usuarioNome,
            usuario: usuario, // Passar objeto usuário completo
            usuarioId: global.usuarioId, // Passar ID para verificações na view
            usuarioIsAdmin: global.usuarioIsAdmin,
            receita: receita,
            isFavorito: isFavorito,
            mensagem: req.query.mensagem,
            sucesso: req.query.sucesso
        });
    } catch (error) {
        console.error("Erro ao buscar detalhes da receita:", error);
        next(error);
    }
});

/* GET formulário para nova receita */
router.get("/nova-receita", verificarLogin, async function(req, res, next) {
    try {
        const categorias = await global.banco.buscarTodasCategorias();
        const usuario = await global.banco.buscarUsuarioPorId(global.usuarioId);
        res.render("recipe_form", {
            titulo: "RecipeMaster - Nova Receita",
            usuarioNome: global.usuarioNome,
            usuario: usuario,
            usuarioIsAdmin: global.usuarioIsAdmin,
            categorias: categorias,
            receita: null,
            mensagem: null,
            sucesso: null,
            actionUrl: "/nova-receita"
        });
    } catch (error) {
        console.error("Erro ao carregar formulário de nova receita:", error);
        next(error);
    }
});

/* GET formulário para editar receita */
router.get("/editar-receita/:id", verificarLogin, async function(req, res, next) {
    try {
        const receitaId = parseInt(req.params.id);
        const receita = await global.banco.buscarReceitaPorId(receitaId);
        const usuario = await global.banco.buscarUsuarioPorId(global.usuarioId);

        if (!receita) {
            return res.status(404).render("error", { message: "Receita não encontrada.", error: { status: 404 } });
        }

        if (receita.autor_id !== global.usuarioId && !global.usuarioIsAdmin) {
            return res.status(403).render("error", { message: "Não tem permissão para editar esta receita.", error: { status: 403 } });
        }

        const categorias = await global.banco.buscarTodasCategorias();
        res.render("recipe_form", {
            titulo: "RecipeMaster - Editar Receita",
            usuarioNome: global.usuarioNome,
            usuario: usuario,
            usuarioIsAdmin: global.usuarioIsAdmin,
            categorias: categorias,
            receita: receita,
            mensagem: null,
            sucesso: null,
            actionUrl: `/editar-receita/${receitaId}`
        });
    } catch (error) {
        console.error("Erro ao carregar formulário de edição de receita:", error);
        next(error);
    }
});

/* GET perfil do usuário */
router.get("/perfil", verificarLogin, async function(req, res, next) {
    try {
        const usuario = await global.banco.buscarUsuarioPorId(global.usuarioId);
        const minhasReceitas = await global.banco.buscarReceitasPorAutor(global.usuarioId);
        const meusFavoritos = await global.banco.buscarFavoritosPorUsuarioId(global.usuarioId);

        if (!usuario) {
             delete global.usuarioId;
             delete global.usuarioNome;
             delete global.usuarioIsAdmin;
             return res.redirect("/?mensagem=Erro ao carregar perfil. Faça login novamente.");
        }

        res.render("profile", {
            titulo: "RecipeMaster - Meu Perfil",
            usuarioNome: global.usuarioNome,
            usuario: usuario,
            usuarioIsAdmin: global.usuarioIsAdmin,
            minhasReceitas: minhasReceitas,
            meusFavoritos: meusFavoritos,
            mensagem: req.query.mensagem,
            sucesso: req.query.sucesso
        });
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        next(error);
    }
});

/* GET logout */
router.get("/logout", function(req, res, next) {
    delete global.usuarioId;
    delete global.usuarioNome;
    delete global.usuarioIsAdmin;
    // Limpa também as variáveis de admin se existirem
    delete global.adminId;
    delete global.adminNome;
    res.redirect("/");
});

// --- Rotas POST ---

/* POST login */
router.post("/login", async function(req, res, next) {
    const email = req.body.email;
    const senha = req.body.senha;

    if (!email || !senha) {
        return res.render("index", { titulo: "RecipeMaster - Login", mensagem: "Email e senha são obrigatórios.", sucesso: false });
    }

    try {
        const usuario = await global.banco.buscarUsuarioPorEmailSenha(email, null); // Busca só por email primeiro

        if (!usuario) {
            return res.render("index", { titulo: "RecipeMaster - Login", mensagem: "Email ou senha inválidos.", sucesso: false });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.render("index", { titulo: "RecipeMaster - Login", mensagem: "Email ou senha inválidos.", sucesso: false });
        }

        global.usuarioId = usuario.id;
        global.usuarioNome = usuario.nome;
        global.usuarioIsAdmin = usuario.is_admin;
        // Se for admin, define também as variáveis de admin
        if (usuario.is_admin) {
            global.adminId = usuario.id;
            global.adminNome = usuario.nome;
        }

        res.redirect("/browse");

    } catch (error) {
        console.error("Erro no login:", error);
        res.render("index", { titulo: "RecipeMaster - Login", mensagem: "Ocorreu um erro durante o login. Tente novamente.", sucesso: false });
    }
});

/* POST registo */
router.post("/registo", async function(req, res, next) {
    const { nome, email, senha, confirmar_senha, telefone } = req.body; // Adicionado telefone

    if (!nome || !email || !senha || !confirmar_senha) {
        return res.render("index", { titulo: "RecipeMaster - Login", mensagem: "Nome, email, senha e confirmação são obrigatórios.", sucesso: false });
    }

    if (senha !== confirmar_senha) {
        return res.render("index", { titulo: "RecipeMaster - Login", mensagem: "As senhas não coincidem.", sucesso: false });
    }

    try {
        const usuarioExistente = await global.banco.buscarUsuarioPorEmailSenha(email, null);
        if (usuarioExistente) {
            return res.render("index", { titulo: "RecipeMaster - Login", mensagem: "Este email já está registado.", sucesso: false });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Insere usuário (telefone é opcional no banco)
        const novoUsuarioId = await global.banco.inserirUsuario(nome, email, senhaHash);

        // Atualiza telefone se fornecido (poderia ser feito no INSERT se o banco.js fosse ajustado)
        if (telefone) {
            await global.banco.atualizarPerfilUsuario(novoUsuarioId, undefined, undefined, telefone);
        }

        global.usuarioId = novoUsuarioId;
        global.usuarioNome = nome;
        global.usuarioIsAdmin = false;

        res.redirect("/browse");

    } catch (error) {
        console.error("Erro no registo:", error);
        res.render("index", { titulo: "RecipeMaster - Login", mensagem: "Ocorreu um erro durante o registo. Tente novamente.", sucesso: false });
    }
});

/* POST nova receita */
router.post("/nova-receita", verificarLogin, uploadRecipeImages, async function(req, res, next) {
    const { titulo, categoria_id, tempo_preparo, rendimento, descricao, ingredientes, modo_preparo } = req.body;
    const autor_id = global.usuarioId;

    // Validação básica
    if (!titulo || !categoria_id || !descricao || !ingredientes || !modo_preparo) {
        // Recarrega o formulário com mensagem de erro e dados preenchidos
        const categorias = await global.banco.buscarTodasCategorias();
        const usuario = await global.banco.buscarUsuarioPorId(global.usuarioId);
        // Apagar ficheiros carregados se a validação falhar
        if (req.files) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        return res.render("recipe_form", {
            titulo: "RecipeMaster - Nova Receita",
            usuarioNome: global.usuarioNome,
            usuario: usuario,
            usuarioIsAdmin: global.usuarioIsAdmin,
            categorias: categorias,
            receita: req.body, // Passa os dados submetidos de volta
            mensagem: "Todos os campos obrigatórios (Título, Categoria, Descrição, Ingredientes, Modo de Preparo) devem ser preenchidos.",
            sucesso: false,
            actionUrl: "/nova-receita"
        });
    }

    try {
        // Insere a receita (por defeito is_aprovado = false)
        const novaReceitaId = await global.banco.inserirReceita(
            titulo, descricao, tempo_preparo, rendimento, ingredientes, modo_preparo, autor_id, parseInt(categoria_id)
        );

        // Insere as imagens associadas, se houver
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const imagePath = `/uploads/recipes/${file.filename}`;
                await global.banco.inserirImagemReceita(novaReceitaId, imagePath);
            }
        }

        // Redireciona para a página da receita (mesmo pendente, o autor pode ver) ou para o perfil
        res.redirect(`/receita/${novaReceitaId}?mensagem=${encodeURIComponent("Receita enviada para aprovação!")}&sucesso=true`);
        // Ou redirecionar para o perfil:
        // res.redirect(`/perfil?mensagem=${encodeURIComponent("Receita enviada para aprovação!")}&sucesso=true#minhas-receitas`);

    } catch (error) {
        console.error("Erro ao criar receita:", error);
        // Apagar ficheiros carregados em caso de erro no banco
        if (req.files) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        // Recarrega o formulário com mensagem de erro
        const categorias = await global.banco.buscarTodasCategorias();
        const usuario = await global.banco.buscarUsuarioPorId(global.usuarioId);
        res.render("recipe_form", {
            titulo: "RecipeMaster - Nova Receita",
            usuarioNome: global.usuarioNome,
            usuario: usuario,
            usuarioIsAdmin: global.usuarioIsAdmin,
            categorias: categorias,
            receita: req.body,
            mensagem: "Ocorreu um erro ao salvar a receita. Tente novamente.",
            sucesso: false,
            actionUrl: "/nova-receita"
        });
    }
});

/* POST editar receita */
router.post("/editar-receita/:id", verificarLogin, uploadRecipeImages, async function(req, res, next) {
    const receitaId = parseInt(req.params.id);
    const { titulo, categoria_id, tempo_preparo, rendimento, descricao, ingredientes, modo_preparo } = req.body;
    const usuarioId = global.usuarioId;
    let mensagem = "";
    let sucesso = false;

    // Validação básica
    if (!titulo || !categoria_id || !descricao || !ingredientes || !modo_preparo) {
        // Apagar ficheiros carregados se a validação falhar
        if (req.files) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        return res.redirect(`/editar-receita/${receitaId}?mensagem=${encodeURIComponent("Campos obrigatórios não preenchidos.")}&sucesso=false`);
    }

    try {
        // Verifica permissão para editar
        const receitaExistente = await global.banco.buscarReceitaPorId(receitaId);
        if (!receitaExistente) {
            if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(404).render("error", { message: "Receita não encontrada.", error: { status: 404 } });
        }
        if (receitaExistente.autor_id !== usuarioId && !global.usuarioIsAdmin) {
            if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(403).render("error", { message: "Não tem permissão para editar esta receita.", error: { status: 403 } });
        }

        // Atualiza os dados da receita (define como não aprovada novamente após edição, exceto se for admin?)
        // Decisão: Manter o status de aprovação atual ao editar.
        await global.banco.atualizarReceita(
            receitaId,
            titulo, descricao, tempo_preparo, rendimento, ingredientes, modo_preparo, parseInt(categoria_id),
            undefined // Não altera o status de aprovação aqui
        );

        // Se novas imagens foram enviadas, remove as antigas e adiciona as novas
        if (req.files && req.files.length > 0) {
            // 1. Remover imagens antigas do disco
            if (receitaExistente.imagens && receitaExistente.imagens.length > 0) {
                receitaExistente.imagens.forEach(imgPath => {
                    const fullPath = path.join(__dirname, "../public", imgPath);
                    fs.unlink(fullPath, (err) => {
                        if (err && err.code !== "ENOENT") console.error(`Erro ao remover imagem antiga ${fullPath}:`, err);
                    });
                });
            }
            // 2. Remover referências antigas do banco
            await global.banco.removerImagensReceita(receitaId);
            // 3. Adicionar novas imagens ao banco
            for (const file of req.files) {
                const imagePath = `/uploads/recipes/${file.filename}`;
                await global.banco.inserirImagemReceita(receitaId, imagePath);
            }
        }

        mensagem = "Receita atualizada com sucesso!";
        sucesso = true;
        res.redirect(`/receita/${receitaId}?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);

    } catch (error) {
        console.error("Erro ao editar receita:", error);
        // Apagar ficheiros carregados em caso de erro
        if (req.files) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        mensagem = "Ocorreu um erro ao atualizar a receita.";
        sucesso = false;
        res.redirect(`/editar-receita/${receitaId}?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
    }
});


/* POST adicionar/remover favorito */
router.post("/receita/:id/favoritar", verificarLogin, async function(req, res, next) {
    const receitaId = parseInt(req.params.id);
    const usuarioId = global.usuarioId;
    let mensagem = "";
    let sucesso = false;

    try {
        const jaFavorito = await global.banco.verificarFavorito(usuarioId, receitaId);

        if (jaFavorito) {
            await global.banco.removerFavorito(usuarioId, receitaId);
            mensagem = "Receita removida dos favoritos.";
            sucesso = true;
        } else {
            await global.banco.adicionarFavorito(usuarioId, receitaId);
            mensagem = "Receita adicionada aos favoritos.";
            sucesso = true;
        }
        res.redirect(`/receita/${receitaId}?mensagem=${encodeURIComponent(mensagem)}&sucesso=${sucesso}`);
    } catch (error) {
        console.error("Erro ao favoritar/desfavoritar receita:", error);
        next(error);
    }
});

/* POST adicionar avaliação */
router.post("/receita/:id/avaliar", verificarLogin, async function(req, res, next) {
    const receitaId = parseInt(req.params.id);
    const usuarioId = global.usuarioId;
    const { nota, comentario } = req.body;

    if (!nota || nota < 1 || nota > 5) {
        return res.redirect(`/receita/${receitaId}?mensagem=${encodeURIComponent("Nota inválida.")}&sucesso=false`);
    }

    try {
        await global.banco.inserirAvaliacao(parseInt(nota), comentario, usuarioId, receitaId);
        res.redirect(`/receita/${receitaId}?mensagem=${encodeURIComponent("Avaliação adicionada com sucesso!")}&sucesso=true`);
    } catch (error) {
        console.error("Erro ao adicionar avaliação:", error);
        res.redirect(`/receita/${receitaId}?mensagem=${encodeURIComponent("Erro ao adicionar avaliação.")}&sucesso=false`);
    }
});

/* POST atualizar perfil */
router.post("/perfil/atualizar", verificarLogin, uploadUserImages, async function(req, res, next) {
    const { nome, email, telefone, data_nascimento, sobre } = req.body;
    const usuarioId = global.usuarioId;
    let fotoPerfilPath = undefined;
    let fotoCapaPath = undefined;

    if (req.files) {
        if (req.files.foto_perfil) {
            fotoPerfilPath = `/uploads/users/${req.files.foto_perfil[0].filename}`;
        }
        if (req.files.foto_capa) {
            fotoCapaPath = `/uploads/users/${req.files.foto_capa[0].filename}`;
        }
    }

    try {
        const usuarioAntigo = await global.banco.buscarUsuarioPorId(usuarioId);

        if (email && email !== usuarioAntigo.email) {
            const outroUsuario = await global.banco.buscarUsuarioPorEmailSenha(email, null);
            if (outroUsuario) {
                 if (fotoPerfilPath) fs.unlinkSync(path.join(__dirname, "../public", fotoPerfilPath));
                 if (fotoCapaPath) fs.unlinkSync(path.join(__dirname, "../public", fotoCapaPath));
                 return res.redirect(`/perfil?mensagem=${encodeURIComponent("Email já está em uso por outra conta.")}&sucesso=false`);
            }
        }

        await global.banco.atualizarPerfilUsuario(
            usuarioId,
            nome || undefined,
            email || undefined,
            telefone !== undefined ? telefone : usuarioAntigo.telefone, // Manter antigo se não fornecido
            data_nascimento || undefined,
            sobre !== undefined ? sobre : usuarioAntigo.sobre, // Manter antigo se não fornecido
            fotoPerfilPath, // Passa o novo path ou undefined
            fotoCapaPath
        );

        if (fotoPerfilPath && usuarioAntigo.foto_perfil_path) {
            fs.unlink(path.join(__dirname, "../public", usuarioAntigo.foto_perfil_path), (err) => {
                if (err && err.code !== "ENOENT") console.error("Erro ao remover foto de perfil antiga:", err);
            });
        }
        if (fotoCapaPath && usuarioAntigo.foto_capa_path) {
            fs.unlink(path.join(__dirname, "../public", usuarioAntigo.foto_capa_path), (err) => {
                if (err && err.code !== "ENOENT") console.error("Erro ao remover foto de capa antiga:", err);
            });
        }

        if (nome) {
            global.usuarioNome = nome;
        }

        res.redirect(`/perfil?mensagem=${encodeURIComponent("Perfil atualizado com sucesso!")}&sucesso=true`);

    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        if (fotoPerfilPath) fs.unlinkSync(path.join(__dirname, "../public", fotoPerfilPath));
        if (fotoCapaPath) fs.unlinkSync(path.join(__dirname, "../public", fotoCapaPath));
        res.redirect(`/perfil?mensagem=${encodeURIComponent("Erro ao atualizar perfil.")}&sucesso=false`);
    }
});

/* POST alterar senha */
router.post("/perfil/alterar-senha", verificarLogin, async function(req, res, next) {
    const { senha_atual, nova_senha, confirmar_nova_senha } = req.body;
    const usuarioId = global.usuarioId;

    if (!senha_atual || !nova_senha || !confirmar_nova_senha) {
        return res.redirect(`/perfil?mensagem=${encodeURIComponent("Todos os campos de senha são obrigatórios.")}&sucesso=false`);
    }

    if (nova_senha !== confirmar_nova_senha) {
        return res.redirect(`/perfil?mensagem=${encodeURIComponent("As novas senhas não coincidem.")}&sucesso=false`);
    }

    try {
        const usuario = await global.banco.buscarUsuarioPorId(usuarioId);
        if (!usuario) {
             return res.redirect(`/perfil?mensagem=${encodeURIComponent("Usuário não encontrado.")}&sucesso=false`);
        }

        const senhaCorreta = await bcrypt.compare(senha_atual, usuario.senha);
        if (!senhaCorreta) {
            return res.redirect(`/perfil?mensagem=${encodeURIComponent("Senha atual incorreta.")}&sucesso=false`);
        }

        const salt = await bcrypt.genSalt(10);
        const novaSenhaHash = await bcrypt.hash(nova_senha, salt);

        await global.banco.atualizarSenhaUsuario(usuarioId, novaSenhaHash);

        res.redirect(`/perfil?mensagem=${encodeURIComponent("Senha alterada com sucesso!")}&sucesso=true`);

    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        res.redirect(`/perfil?mensagem=${encodeURIComponent("Erro ao alterar senha.")}&sucesso=false`);
    }
});


module.exports = router;


/* POST toggle favorito */
router.post("/toggle-favorito", verificarLogin, async function(req, res, next) {
    try {
        const { receita_id } = req.body;
        const usuarioId = global.usuarioId;

        if (!receita_id) {
            return res.status(400).json({ success: false, message: "ID da receita é obrigatório" });
        }

        // Verifica se já é favorito
        const isFavorito = await global.banco.verificarFavorito(usuarioId, receita_id);

        let action;
        if (isFavorito) {
            // Remove dos favoritos
            await global.banco.removerFavorito(usuarioId, receita_id);
            action = 'removed';
        } else {
            // Adiciona aos favoritos
            await global.banco.adicionarFavorito(usuarioId, receita_id);
            action = 'added';
        }

        res.json({ success: true, action: action });

    } catch (error) {
        console.error("Erro ao toggle favorito:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
});

/* POST avaliar receita */
router.post("/avaliar-receita", verificarLogin, async function(req, res, next) {
    try {
        const { receita_id, nota, comentario } = req.body;
        const usuarioId = global.usuarioId;

        if (!receita_id || !nota) {
            return res.redirect(`/receita/${receita_id}?mensagem=${encodeURIComponent("Nota é obrigatória")}&sucesso=false`);
        }

        const notaInt = parseInt(nota);
        if (notaInt < 1 || notaInt > 5) {
            return res.redirect(`/receita/${receita_id}?mensagem=${encodeURIComponent("Nota deve ser entre 1 e 5")}&sucesso=false`);
        }

        await global.banco.inserirAvaliacao(notaInt, comentario || null, usuarioId, receita_id);

        res.redirect(`/receita/${receita_id}?mensagem=${encodeURIComponent("Avaliação adicionada com sucesso!")}&sucesso=true`);

    } catch (error) {
        console.error("Erro ao avaliar receita:", error);
        res.redirect(`/receita/${receita_id}?mensagem=${encodeURIComponent("Erro ao adicionar avaliação")}&sucesso=false`);
    }
});

