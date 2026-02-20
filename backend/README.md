# BeatWap Backend

Backend da BeatWap Productions construído com Node.js, Express e PostgreSQL.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Multer** - Upload de arquivos
- **CORS** - Configuração de CORS

## 📋 Pré-requisitos

- Node.js 16+
- PostgreSQL

## 🔧 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Iniciar servidor
npm run dev # Modo desenvolvimento
npm start   # Modo produção
```

## 🌐 Configuração do Banco de Dados

O backend está configurado para usar o PostgreSQL da CloudClusters:

```
Host: postgresql-208539-0.cloudclusters.net
Port: 19931
Database: BeatWap
User: Alan Godoy
Password: @Aggtr4907
```

## 🔑 Rotas da API

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Obter dados do usuário autenticado

### Perfis
- `GET /api/profiles/:userId` - Obter perfil do usuário
- `PUT /api/profiles` - Atualizar perfil
- `GET /api/profiles/artists/all` - Listar todos os artistas

### Músicas
- `GET /api/musics` - Listar todas as músicas
- `GET /api/musics/:id` - Obter música específica
- `POST /api/musics` - Criar nova música
- `PUT /api/musics/:id` - Atualizar música
- `DELETE /api/musics/:id` - Excluir música

### Projetos
- `GET /api/projects` - Listar todos os projetos
- `GET /api/projects/:id` - Obter projeto específico
- `POST /api/projects` - Criar novo projeto
- `PUT /api/projects/:id` - Atualizar projeto
- `DELETE /api/projects/:id` - Excluir projeto

### Eventos
- `GET /api/events` - Listar todos os eventos
- `GET /api/events/:id` - Obter evento específico
- `POST /api/events` - Criar novo evento
- `PUT /api/events/:id` - Atualizar evento
- `DELETE /api/events/:id` - Excluir evento

### Composições
- `GET /api/compositions` - Listar todas as composições
- `GET /api/compositions/:id` - Obter composição específica
- `POST /api/compositions` - Criar nova composição
- `PUT /api/compositions/:id` - Atualizar composição
- `DELETE /api/compositions/:id` - Excluir composição

### Lançamentos
- `GET /api/releases` - Listar todos os lançamentos
- `GET /api/releases/:id` - Obter lançamento específico
- `POST /api/releases` - Criar novo lançamento
- `PUT /api/releases/:id` - Atualizar lançamento
- `DELETE /api/releases/:id` - Excluir lançamento

### Produtores
- `GET /api/producers` - Listar todos os produtores
- `GET /api/producers/:id` - Obter produtor específico
- `GET /api/producers/:id/services` - Obter serviços do produtor
- `POST /api/producers/:id/services` - Adicionar serviço

### Patrocinadores
- `GET /api/sponsors` - Listar todos os patrocinadores
- `GET /api/sponsors/:id` - Obter patrocinador específico
- `POST /api/sponsors` - Criar novo patrocinador
- `PUT /api/sponsors/:id` - Atualizar patrocinador
- `DELETE /api/sponsors/:id` - Excluir patrocinador

### Upload
- `POST /api/upload/single` - Fazer upload de arquivo único
- `POST /api/upload/multiple` - Fazer upload de múltiplos arquivos
- `DELETE /api/upload/:filename` - Excluir arquivo

## 🔒 Autenticação

A maioria das rotas requer autenticação via token JWT no header:
```
Authorization: Bearer <token>
```

## 🌐 CORS

O backend está configurado para aceitar requisições de:
- `https://beatwapproducoes.pages.dev` (Cloudflare Pages)
- `http://localhost:5173` (Desenvolvimento local)

## 📁 Estrutura de Pastas

```
backend/
├── middleware/          # Middlewares
├── routes/             # Rotas da API
├── uploads/            # Arquivos enviados
├── db.js               # Configuração do banco
├── index.js            # Arquivo principal
└── package.json        # Dependências
```

## 🚀 Deploy

Para fazer deploy em produção:

1. Configure as variáveis de ambiente
2. Execute `npm install --production`
3. Execute `npm start`

## 📞 Suporte

Para problemas ou dúvidas, entre em contato com a equipe de desenvolvimento.