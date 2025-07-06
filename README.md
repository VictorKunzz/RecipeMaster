# RecipeMaster - Aplicação Completa (Node.js + EJS + MySQL)

Integrantes: Victor Henrique Kunz de Souza, Henrique Cordeiro de Oliveira, Kauã Lucindo

Este é o projeto completo da plataforma RecipeMaster, desenvolvido com Node.js, Express, EJS para o frontend e MySQL como banco de dados, seguindo a estrutura e padrões do projeto "mflix" como base.

Link de acesso ao Figma: https://www.figma.com/design/dAAU4zDWcOpTIhKK7T2tR3/RECIPEMASTER?node-id=0-1&p=f

## Funcionalidades Principais

*   **Usuários:** Cadastro, Login, Edição de Perfil (com upload de fotos), Alteração de Senha, Visualização de Receitas Próprias e Favoritas.
*   **Receitas:** Criação (com upload de múltiplas imagens), Edição, Visualização Detalhada, Busca por texto, Filtro por Categoria, Paginação.
*   **Categorias:** Listagem (usada nos filtros e formulários).
*   **Favoritos:** Adicionar/Remover receitas favoritas.
*   **Avaliações:** Adicionar nota e comentário para receitas.
*   **Administração:** Login separado, Dashboard (estatísticas básicas), Gerenciamento de Usuários (listar, excluir), Gerenciamento de Receitas (listar todas, aprovar pendentes, excluir), Gerenciamento de Categorias (CRUD).

## Estrutura do Projeto

```
/recipemaster
|-- bin/
|   `-- www             # Script de inicialização do servidor
|-- public/
|   |-- images/         # Imagens estáticas (placeholders, logos, etc.)
|   |-- javascripts/    # Scripts JS do frontend (se houver)
|   |-- stylesheets/
|   |   `-- style.css   # Folha de estilo principal
|   `-- uploads/        # Diretório para uploads (criado dinamicamente)
|       |-- recipes/
|       `-- users/
|-- routes/
|   |-- admin.js        # Rotas da área administrativa
|   `-- index.js        # Rotas principais da aplicação
|-- views/
|   |-- admin/          # Views EJS da área administrativa (login, dashboard, etc.)
|   |-- partials/       # Partials EJS (header, footer)
|   |-- browse.ejs
|   |-- error.ejs
|   |-- index.ejs       # Página de login/registo
|   |-- profile.ejs
|   |-- recipe_detail.ejs
|   |-- recipe_form.ejs
|   `-- ...             # Outras views EJS
|-- .env                # Ficheiro de configuração de ambiente (NÃO INCLUÍDO NO GIT)
|-- app.js              # Configuração principal da aplicação Express
|-- banco.js            # Módulo de interação com o banco de dados MySQL
|-- database_schema.sql # Script SQL para criar a estrutura do banco
|-- package.json
|-- package-lock.json
`-- README.md           # Este ficheiro
```

## Configuração e Execução

**Pré-requisitos:**

*   Node.js (versão 14 ou superior recomendada)
*   NPM (geralmente vem com o Node.js)
*   Servidor MySQL instalado e em execução.

**Passos:**

1.  **Clonar/Extrair o Projeto:**
    *   Extraia o conteúdo do ficheiro `.zip` para um diretório de sua escolha.

2.  **Configurar o Banco de Dados MySQL:**
    *   Crie um banco de dados MySQL. Exemplo:
        ```sql
        CREATE DATABASE recipemaster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        ```
    *   Crie um usuário MySQL ou use um existente que tenha permissões para este banco de dados.
    *   Execute o script `database_schema.sql` fornecido neste projeto no banco de dados recém-criado. Isso criará todas as tabelas necessárias.
        *   Pode usar uma ferramenta como MySQL Workbench, DBeaver, phpMyAdmin ou a linha de comando do MySQL:
            ```bash
            mysql -u SEU_USUARIO -p recipemaster < database_schema.sql
            ```
            (Substitua `SEU_USUARIO` pelo seu nome de usuário MySQL e digite a senha quando solicitado).

3.  **Configurar Variáveis de Ambiente:**
    *   Renomeie (ou crie) o ficheiro `.env.example` para `.env` na raiz do projeto.
    *   Edite o ficheiro `.env` com as suas credenciais do banco de dados MySQL:
        ```dotenv
        DB_HOST=localhost
        DB_USER=SEU_USUARIO_MYSQL
        DB_PASSWORD=SUA_SENHA_MYSQL
        DB_NAME=recipemaster
        # JWT_SECRET=gere_uma_chave_secreta_forte_aqui # (Não implementado nesta versão, mas bom ter)
        ```

4.  **Instalar Dependências:**
    *   Abra um terminal ou prompt de comando na raiz do projeto e execute:
        ```bash
        npm install
        ```

5.  **Criar Primeiro Usuário Administrador (Opcional, mas recomendado):**
    *   Pode inserir manualmente um usuário administrador na tabela `usuarios` do banco de dados ou modificar o script `database_schema.sql` para incluir um admin inicial.
    *   Exemplo de SQL para inserir um admin (ajuste a senha hash se necessário ou use o registo normal e depois atualize `is_admin` para `TRUE`):
        ```sql
        -- Cuidado: Use uma senha hash gerada por bcrypt! Este é apenas um exemplo.
        INSERT INTO usuarios (nome, email, senha, is_admin) VALUES ('Admin', 'admin@recipemaster.com', '$2a$10$...', TRUE);
        ```

6.  **Iniciar a Aplicação:**
    *   Execute o comando:
        ```bash
        npm start
        ```
    *   A aplicação estará disponível em `http://localhost:3000` (ou a porta definida em `bin/www`).

7.  **Acesso:**
    *   **Site Principal:** `http://localhost:3000` (Página de login/registo)
    *   **Área Administrativa:** `http://localhost:3000/admin` (Página de login do admin)

## Notas Adicionais

*   **Uploads:** As imagens carregadas são salvas localmente na pasta `public/uploads/`. Certifique-se de que a aplicação tem permissão de escrita neste diretório.
*   **Segurança:** Para produção, é crucial usar senhas fortes, configurar HTTPS, proteger as variáveis de ambiente e revisar as práticas de segurança.
*   **Sessão:** A gestão da sessão de login é feita através de variáveis globais (`global.usuarioId`, `global.usuarioNome`, etc.), seguindo o padrão do projeto `mflix`.

---

