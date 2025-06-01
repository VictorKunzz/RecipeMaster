# RecipeMaster Development Checklist

## Fase 1: Planeamento e Design (Passo 1-2)

- [X] Analisar completamente os requisitos funcionais e não funcionais.
- [X] Analisar o design do Figma e os screenshots para entender a UI/UX.
- [X] Definir o modelo de dados para Usuários, Receitas, Categorias, Favoritos, Avaliações, Comentários.
- [X] Escolher e configurar o banco de dados (MongoDB).
- [X] Criar o esquema do banco de dados.

## Fase 2: Desenvolvimento do Backend (Passo 3-5)

- [X] Configurar o projeto Node.js (Express.js).
- [X] Implementar autenticação de usuário (cadastro, login, recuperação de senha) usando JWT ou sessões.
- [X] Criar rotas da API (endpoints) para Usuários (CRUD, perfil).
- [X] Criar rotas da API para Receitas (CRUD, busca, por categoria).
- [X] Criar rotas da API para Categorias (CRUD).
- [X] Implementar funcionalidade de Favoritos.
- [X] Implementar funcionalidade de Avaliação e Comentários.
- [X] Implementar upload e armazenamento de imagens (ex: Cloudinary, S3, ou localmente).
- [X] Implementar funcionalidades de Administrador (dashboard, gerenciamento de receitas/categorias, moderação).
- [X] Configurar middleware para validação e tratamento de erros.

## Fase 3: Testes e Entrega (Passo 6-7)

- [X] Validar manualmente todos os fluxos de usuário e administrador (backend completo).
- [X] Validar a API (backend completo).
- [ ] Preparar a documentação da API (ex: Swagger/OpenAPI) - *Opcional/Não solicitado*
- [ ] Empacotar o código-fonte e as instruções de configuração/execução.
- [ ] Entregar o projeto finalizado ao usuário.

