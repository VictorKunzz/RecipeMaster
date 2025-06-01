-- Esquema do Banco de Dados para RecipeMaster (MySQL)

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL, -- Armazenar hash da senha
    telefone VARCHAR(20) NULL,
    data_nascimento DATE NULL,
    sobre TEXT NULL,
    foto_perfil_path VARCHAR(512) NULL, -- Caminho para a imagem de perfil
    foto_capa_path VARCHAR(512) NULL,   -- Caminho para a imagem de capa
    is_admin BOOLEAN DEFAULT FALSE,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Categorias de Receitas
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Receitas
CREATE TABLE IF NOT EXISTS receitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    tempo_preparo VARCHAR(100) NULL, -- Ex: "30 minutos", "1 hora e 30 minutos"
    rendimento VARCHAR(100) NULL,    -- Ex: "4 porções", "Serve 6 pessoas"
    ingredientes TEXT NOT NULL,      -- Pode ser JSON ou texto formatado
    modo_preparo TEXT NOT NULL,
    autor_id INT NOT NULL,
    categoria_id INT NOT NULL,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_aprovado BOOLEAN DEFAULT FALSE, -- Para moderação pelo admin
    FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE, -- Ou ON DELETE SET NULL se preferir manter receitas de usuários excluídos
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT -- Não permite excluir categoria com receitas associadas
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para armazenar os caminhos das imagens das receitas (relação 1-N)
CREATE TABLE IF NOT EXISTS imagens_receita (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receita_id INT NOT NULL,
    imagem_path VARCHAR(512) NOT NULL, -- Caminho para a imagem da receita
    FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Avaliações/Comentários
CREATE TABLE IF NOT EXISTS avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nota INT NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT NULL,
    autor_id INT NOT NULL,
    receita_id INT NOT NULL,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Favoritos (relação N-N entre usuários e receitas)
CREATE TABLE IF NOT EXISTS favoritos (
    usuario_id INT NOT NULL,
    receita_id INT NOT NULL,
    data_adicao DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, receita_id), -- Chave primária composta
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para otimização de buscas comuns
CREATE INDEX idx_receitas_titulo ON receitas(titulo);
CREATE INDEX idx_receitas_categoria ON receitas(categoria_id);
CREATE INDEX idx_receitas_autor ON receitas(autor_id);
CREATE INDEX idx_avaliacoes_receita ON avaliacoes(receita_id);

-- (Opcional) Inserir algumas categorias iniciais
INSERT INTO categorias (nome) VALUES 
     ("Bolos e Tortas"),
     ("Carnes"),
     ("Aves"),
     ("Peixes e Frutos do Mar"),
     ("Saladas e Molhos"),
     ("Sopas"),
     ("Massas"),
     ("Bebidas"),
     ("Doces e Sobremesas"),
     ("Lanches");

-- (Opcional) Criar um usuário administrador inicial (lembre-se de trocar a senha)
 INSERT INTO usuarios (nome, email, senha, is_admin) VALUES 
 ('Admin', 'admin@recipemaster.com', 'admin123', TRUE);

