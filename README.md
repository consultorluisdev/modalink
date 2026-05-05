# 🛍️ ModaLink

SaaS moderno para criação de catálogo de produtos e link na bio para lojas de moda.

---

## 🚀 Tecnologias

Frontend:
- React + Vite
- TypeScript
- TailwindCSS
- React Router DOM
- Axios

Backend:
- .NET 8
- Entity Framework Core
- PostgreSQL
- JWT Authentication
- Docker

---

## 📦 Funcionalidades

- 🔐 Autenticação (Login / Register)
- 📊 Dashboard
- 🛍️ Cadastro de Produtos
- 📋 Listagem de Produtos
- 🖼️ Upload de imagens (em desenvolvimento)
- 🔗 Link na bio (em desenvolvimento)
- 🛒 Loja pública (em desenvolvimento)

---

## 🖥️ Estrutura do Projeto

ModaLink/
├── backend/
│   └── ModaLink.Api
├── frontend/
│   └── modalink-frontend
├── mobile/ (futuro)
└── docker/

---

## ⚙️ Como rodar o projeto

Backend (.NET):

cd backend/ModaLink.Api  
dotnet run  

Frontend (React):

cd frontend/modalink-frontend  
npm install  
npm run dev  

Banco de dados (Docker):

docker-compose up -d  

---

## 🔐 Autenticação

POST /api/auth/register  
POST /api/auth/login  

---

## 📌 Roadmap

- [x] Login e Register  
- [x] Dashboard  
- [x] Produtos (CRUD básico)  
- [ ] Upload de imagem  
- [ ] Catálogo público  
- [ ] Link na bio  
- [ ] Deploy  

---

## 🎯 Objetivo

Criar um SaaS simples e eficiente para lojistas divulgarem seus produtos através de catálogo online e link compartilhável.

---

## 👨‍💻 Autor

Luis Fernando Lopes  

---

## ⭐ Status

🚧 Em desenvolvimento
