# Auditoria Técnica — ModaLink

**Última revisão:** 28/10/2026
**Projeto:** ModaLink — PDV + Gestão + Crediário para lojas de moda/varejo
**Stack:** .NET 8 + React 19 (Vite) + PostgreSQL 15 + Docker
**Escopo:** código atual do repositório (`backend/ModaLink.Api`, `frontend/modalink-frontend`, `docker/`, `mobile/`)
**Documento único:** consolida e substitui `AUDITORIA_MODATALINK.md` e `AUDITORIA2_MODALINK.md` (removidos).

> **Legenda de status**
> ✅ Implementado · 🟡 Parcial / com ressalvas · 🔴 Ausente ou quebrado
>
> **Legenda de prioridade**
> **P0** bloqueador de segurança/viabilidade · **P1** essencial para V1 · **P2** melhoria pós-V1 · **P3** estratégico

---

## 1. SUMÁRIO EXECUTIVO

O ModaLink é um **MVP funcional de PDV single-tenant** com catálogo, crediário, financeiro e relatórios. A base é sólida e evolutiva (Controllers → EF Core, sem necessidade de rewrite).

**Veredito:** pronto para uso interno de **uma loja**, com ressalvas de segurança; **não pronto** para SaaS multi-tenant nem para catálogo/e-commerce público completo.

### O que mudou desde a auditoria de 20/10/2026

| Item | Antes | Agora | Evidência |
|------|-------|-------|-----------|
| RBAC nos endpoints admin | 🔴 ausente | ✅ implementado | `AuthController.cs:122,141,155` |
| Registro público aceita `Role` arbitrário | 🔴 | ✅ força `Vendedor` | `AuthController.cs:36` |
| Login ignora `IsActive` | 🔴 | ✅ bloqueia inativo | `AuthController.cs:57` |
| Histórico de pedidos (produto) | 🔴 Cascade | ✅ `Restrict` | `AppDbContext.cs:47` |
| Transação Order + estoque | 🔴 2 `SaveChanges` | 🟡 transação única, mas validação/lock ainda frágeis | `OrdersController.cs:242` |
| Secrets hardcoded | 🔴 no `appsettings`/compose | ✅ via `.env` | `appsettings.json`, `docker-compose.yml` |
| Swagger em produção | 🔴 sempre ligado | ✅ só em Development | `Program.cs:63` |
| Token expirado no frontend | 🔴 sem tratamento | ✅ interceptor 401 | `services/api.ts:16` |
| Tipos de Auth no frontend | 🔴 incompletos | ✅ `id:number`, `role`, `isActive` | `AuthContext.tsx:7` |
| CORS restrito | 🔴 | ✅ `WithOrigins` configurado | `Program.cs:49` |
| Multi-tenancy | 🔴 | 🔴 | nenhum `TenantId` |
| Rate limiting / validação DTO | 🔴 | 🔴 | `Program.cs`, `DTOs/*` |

### Top riscos atuais (P0)

1. 🔴 **Multi-tenancy ausente** — uma instância = uma loja; sem isolamento de dados.
2. 🔴 **Rate limiting e validação de entrada ausentes** — auth sem proteção a brute force; DTOs sem validação.
3. 🔴 **Índices críticos ausentes** — FKs, `CreatedAt`, `DueDate` sem índice.
4. 🟡 **Estoque sem lock/concurrency** — dois pedidos simultâneos podem vender o mesmo item.
5. 🟡 **JWT longo sem refresh/HTTPS obrigatório** — token de 7 dias.

---

## 2. ARQUITETURA ATUAL

```
modalink/
├── backend/ModaLink.Api/
│   ├── Controllers/       7 controllers
│   ├── Models/            7 entidades
│   ├── DTOs/              5 arquivos (+2 DTOs inline)
│   ├── Data/AppDbContext   EF Core
│   ├── Migrations/        4 migrations
│   ├── Program.cs          bootstrap, JWT, CORS, migrations
│   └── dockerfile
├── frontend/modalink-frontend/
│   ├── src/pages/         13 páginas
│   ├── src/components/    3 componentes de layout
│   ├── src/services/      7 arquivos (6 domínios + api)
│   ├── src/context/       AuthContext
│   ├── src/hooks/         useAuth
│   ├── src/types/         order.types
│   ├── src/layouts/       MainLayout
│   └── src/routes/        React Router
├── mobile/modalink-mobile/  apenas scaffold (sem app versionado)
├── docker/docker-compose.yml
├── backend/ModaLink.Api/docker-compose.yml  (duplicado)
└── start.sh
```

**Padrão:** monolito em camadas simplificado. Controllers acessam `AppDbContext` diretamente; **não há Service Layer, Domain nem Repositories**.

### O que preservar (🟢)

- Stack moderna e estável (.NET 8 + React 19 + PostgreSQL + Docker).
- Modelo de domínio genérico de varejo (não acoplado a “moda”).
- Crediário com parcelas, entrada e juros simples — lógica de negócio real.
- PDV (`NovaVenda`) funcional com carrinho e validação de estoque.
- Catálogo com `GET /api/products` `[AllowAnonymous]`.
- JWT + BCrypt, migrations automáticas, SPA fallback.
- Organização do frontend (rotas, layouts, services, context).
- Separação Financeiro (recebíveis) vs Vendas.

---

## 3. MODELO DE DADOS E BANCO

### Entidades (7)

| Entidade | Campos principais | Relacionamentos |
|----------|-------------------|-----------------|
| **User** | Id, Name, Email, PasswordHash, Role(string), IsActive, CreatedAt | nenhum |
| **Product** | Id, Title, Description, Price, ImageUrl?, Category?(string), Stock, CreatedAt, UpdatedAt | 1:N OrderItem |
| **Customer** | Id, Name, Email?, Phone?, WhatsApp?, Instagram?, BirthDate?, Notes?, Active, CreditLimit?, CreatedAt | 1:N Order |
| **Order** | Id, CustomerId?, PaymentMethod, Subtotal, Discount, Total, Status, CreatedAt, InstallmentCount?, DownPayment?, InterestRate? | N:1 Customer (SetNull), 1:N Items, 1:N Installments |
| **OrderItem** | Id, OrderId, ProductId, Quantity, UnitPrice, TotalPrice | N:1 Order (Cascade), N:1 Product (**Restrict**) |
| **Installment** | Id, OrderId, InstallmentNumber, Amount, DueDate, IsPaid, PaidAt?, PaidAmount? | N:1 Order (Cascade) |
| **StoreSetting** | Id, StoreName, Phone?, Address?, LogoUrl?, UpdatedAt | singleton |

### Riscos de integridade

| Risco | Status | Detalhe |
|-------|--------|---------|
| Delete de produto com histórico | 🟡 | FK `Restrict` (`AppDbContext.cs:47`) impede apagar produto vendido, mas `DELETE /api/products/{id}` (`ProductsController.cs:121`) não trata o erro → pode retornar 500 |
| Unicidade de e-mail | 🔴 | `User.Email` e `Customer.Email` sem `UNIQUE`; corrida no registro |
| Índices | 🔴 | Apenas `IX_StoreSettings_Id` (`AppDbContext.cs:52`); sem índices em FKs, `CreatedAt`, `DueDate` |
| Concorrência de estoque | 🔴 | Sem `ConcurrencyToken`/lock; dois pedidos podem passar na validação juntos |
| Multi-tenant | 🔴 | Nenhuma entidade possui `TenantId` |
| Escala | 🟡 | PKs `int` Identity; adequado ao porte inicial, não a SaaS de grande volume |

---

## 4. API — MAPA E SEGURANÇA

### AuthController (`/api/auth`)

| Endpoint | Acesso | Observação |
|----------|--------|------------|
| `POST /register` | público | ✅ força `Role = "Vendedor"` (`AuthController.cs:36`) |
| `POST /login` | público | ✅ bloqueia usuário inativo (`AuthController.cs:57`) |
| `GET /me` | autenticado | ✅ |
| `POST /change-password` | autenticado | ✅ valida senha atual |
| `GET /users` | Administrador | ✅ `AuthController.cs:122` |
| `PATCH /users/{id}/toggle-active` | Administrador | ✅ `AuthController.cs:141` |
| `POST /users` | Administrador | ✅ `AuthController.cs:155` |

### Demais controllers

- **ProductsController** (`/api/products`): `GET`/`GET{id}` públicos; `POST`/`PUT`/`DELETE` autenticados. Sem paginação (`ToListAsync` em `ProductsController.cs:22`). Upload duplicado em Create/Update, sem validação de tipo/tamanho.
- **OrdersController** (`/api/orders`, `[Authorize]`): lista com busca, `GET /stats`, detalhe, criação. `GET /stats` carrega **todos** os pedidos em memória (`OrdersController.cs:52-58`).
- **CustomersController** (`/api/customers`, `[Authorize]`): CRUD + métricas. `CreateCustomerDto` declarado dentro do controller.
- **FinancesController** (`/api/finances`, `[Authorize]`): recebíveis, resumo, baixar/reabrir parcela, saldo por cliente. Carrega **todas** as parcelas (`FinancesController.cs:25`).
- **StoreSettingsController** (`/api/store-settings`, `[Authorize]`): singleton; sem endpoint público para branding/catálogo.
- **ReportsController** (`/api/reports`, `[Authorize]`): vendas por período e resumo mensal.

### Achados de segurança

| # | Severidade | Achado | Evidência |
|---|------------|--------|-----------|
| S1 | ✅ P0 | Registro público força `Role = "Vendedor"` | `AuthController.cs:36` |
| S2 | ✅ P0 | Login bloqueia usuário inativo (`IsActive`) | `AuthController.cs:57` |
| S3 | ✅ P0 | CORS restrito a `Cors:AllowedOrigins` | `Program.cs:47-49` |
| S4 | 🔴 P0 | Sem rate limiting em login/registro | `Program.cs` |
| S5 | 🔴 P0 | DTOs sem `DataAnnotations` (nome vazio, preço negativo, e-mail inválido) | `DTOs/*`, DTOs inline |
| S6 | 🟡 P1 | JWT expira em 7 dias fixos, ignorando `ExpirationHours: 2`; sem refresh/revogação | `AuthController.cs:203` |
| S7 | 🟡 P1 | HTTPS não obrigatório (`RequireHttpsMetadata=false`, sem `UseHttpsRedirection`) | `Program.cs:24` |
| S8 | 🟡 P1 | Upload sem validação de MIME/tamanho e sem limite | `ProductsController.cs:26-46`, `:86-106` |
| S9 | 🟡 P1 | Role é string livre (sem enum/validação) | `User.cs:8` |
| S10 | 🟢 | Secrets fora do repositório; `.env` ignorado | `.env`, `.gitignore` |
| S11 | 🟢 | Swagger habilitado apenas em Development | `Program.cs:63-66` |

> **Ação imediata recomendada:** S1, S2 e S3 já foram corrigidos. Restam S4 (rate limiting) e S5 (validação de DTOs) antes de exposição pública.

---

## 5. FRONTEND

### Páginas (13)

| Página | Rota | Estado |
|--------|------|--------|
| Login / Register | `/login`, `/register` | ✅ |
| Dashboard | `/dashboard` | ✅ |
| Products / CreateProduct | `/produtos`, `/produtos/novo` | ✅ |
| Orders | `/pedidos` | ✅ |
| NovaVenda (PDV) | `/vendas/nova` | ✅ |
| Clientes | `/clientes` | ✅ |
| Financeiro | `/financeiro` | ✅ |
| Catálogo | `/catalogo` | 🟡 interno/logado, sem versão pública por slug |
| Reports | `/relatorios` | 🟡 botão “Tentar novamente” não refaz a busca (`Reports/index.tsx:69`) |
| Settings | `/configuracoes` | 🟡 chama endpoints admin sem esconder por role |
| IAVendas | `/ia-vendas` | 🔴 100% mock |

### Services (7)

`api.ts` (Axios + token + 401), `productService`, `orderServices`, `dashboardService`, `financeiroService`, `reportsService`, `settingsService`.

### Problemas

| Problema | Impacto |
|----------|---------|
| `baseURL` fixa em `http://{hostname}:5020` (`api.ts:4`) | Sem suporte a HTTPS/ambiente configurável |
| Sem RBAC na UI | Vendedor vê Configurações e recebe 403 |
| `App.tsx` ainda é o template Vite (código morto) | Confusão/manutenção |
| TopBar: busca apenas visual e notificação falsa | UX enganosa |
| Sem debounce em buscas (Orders/Clientes) | Requests a cada tecla |
| Catálogo/Produtos sem paginação | Performance com crescimento |
| `useAuth()` chamado sem uso em Financeiro/Clientes | Warnings |
| `Reports` retry inoperante | Usuário fica preso no estado de erro |

---

## 6. MULTI-TENANCY — BLOQUEADOR SaaS (P0)

**Estado:** 🔴 ausente.

- Nenhuma entidade possui `TenantId`.
- Nenhum filtro global por tenant.
- `StoreSetting` é singleton (uma loja por instância).
- `User` é global, sem vínculo com loja.
- Catálogo público retorna todos os produtos, sem escopo.

**Para virar SaaS é necessário:**

1. `TenantId` em Product, Customer, Order, OrderItem, Installment, User e StoreSetting.
2. Derivação/validação do tenant por request (claim, header ou subdomínio).
3. **Global Query Filter** obrigatório no EF Core.
4. Índices compostos `(TenantId, Id)` e unicidades por tenant (ex.: `(TenantId, Email)`).
5. Isolamento no Auth (usuários e roles por loja).

---

## 7. FLUXOS DE NEGÓCIO

| Etapa | Status | Gaps |
|-------|--------|------|
| Cadastro de produto | ✅ | Falta SKU, `IsActive`, entidade Category |
| Estoque | 🟡 | Campo único; sem movimentações, sem estorno, validação fora da transação, sem lock |
| Categorias | 🔴 | String livre; sem entidade/CRUD |
| Catálogo público | 🟡 | Sem slug/tenant, paginação, filtro `Stock > 0`, filtros; StoreSettings protegido |
| Cliente | 🟡 | Find-or-create por **nome**; sem unicidade; sem validação de limite de crédito |
| Carrinho | 🔴 | Apenas estado local no frontend |
| Pedido | 🟡 | Transação de insert+baixa existe; status `Pending` no crediário e `Paid` à vista; sem cancelamento |
| Venda | 🟡 | Implícita em `Order`; sem entidade `Sale` |
| Pagamento | 🟡 | Só crediário via `Installment`; à vista não gera registro de pagamento |
| Caixa | 🔴 | Sem abertura/fechamento/sangria/suprimento |
| Baixa de estoque | 🟡 | Decrementa na venda, mas não há devolução em cancelamento |
| Vendedor | 🔴 | Sem `SellerId` no pedido |

### Bugs de fluxo confirmados

| Bug | Evidência |
|-----|-----------|
| Validação de estoque ocorre **antes** da transação | `OrdersController.cs:229-240` vs `:242` |
| Estoque relido item a item dentro da transação (N+1) | `OrdersController.cs:251` |
| Cliente duplicado quando nome difere por espaço/acento | `OrdersController.cs:157-172` |
| Delete de cliente pode deixar pedidos sem vínculo (SetNull) sem aviso | `AppDbContext.cs:33` |

---

## 8. INFRAESTRUTURA E DEVOPS

| Item | Status | Detalhe |
|------|--------|---------|
| Compose | 🟡 | Dois arquivos quase idênticos: `docker/docker-compose.yml` e `backend/ModaLink.Api/docker-compose.yml` |
| Frontend no Docker | 🔴 | `npm run dev -- --host 0.0.0.0` em vez de build estático + nginx |
| `.dockerignore` | 🔴 | Ausente; copia `bin/`, `obj/`, `node_modules` |
| Healthchecks | 🟡 | Só PostgreSQL; API e frontend não têm |
| Portas pgAdmin | 🟡 | 5051 no compose de `docker/`, 5050 no de `backend/`; `start.sh` usa 5050 |
| Ambiente | 🟡 | `.env` com `ASPNETCORE_ENVIRONMENT=Production`; sem `.env.example` versionado |
| Testes | 🔴 | Nenhum projeto/teste automatizado |
| CI | 🔴 | Nenhum workflow (`.github` ausente) |
| Mobile | 🔴 | Apenas scaffold; sem código-fonte de app versionado |

---

## 9. ROADMAP ATUALIZADO

### P0 — Bloqueadores

| ID | Item | Status | Esforço |
|----|------|--------|---------|
| P0-1 | Bloquear `Role` no registro público (forçar `Vendedor` / fluxo de convite) | ✅ | — |
| P0-2 | Validar `IsActive` no login e/ou no middleware | ✅ | — |
| P0-3 | Corrigir status do crediário para `Pending` | ✅ | — |
| P0-4 | Multi-tenancy base (`TenantId` + filtro global) | 🔴 | Médio/Alto |
| P0-5 | CORS restrito por origem configurada | ✅ | — |
| P0-6 | Rate limiting em auth | 🔴 | Médio |
| P0-7 | Validação de DTOs (DataAnnotations/FluentValidation) | 🔴 | Baixo |
| P0-8 | Índices críticos (FKs, `CreatedAt`, `DueDate`) e UNIQUEs | 🔴 | Baixo |
| P0-9 | Concorrência de estoque (token/validação dentro da transação) | 🟡 | Médio |
| P0-10 | Tratar delete de produto com histórico (soft delete ou bloqueio amigável) | 🟡 | Baixo |
| P0-11 | HTTPS obrigatório e JWT com expiração curta/refresh | 🟡 | Médio |
| P0-12 | RBAC admin (backend) | ✅ | — |
| P0-13 | Transação atômica Order+Stock | 🟡 | — |
| P0-14 | Interceptor 401 + tipos de Auth | ✅ | — |

### P1 — V1 essencial

| ID | Item |
|----|------|
| P1-1 | Categories: entidade + CRUD + tenant |
| P1-2 | Products: SKU (unique por tenant) + `IsActive` |
| P1-3 | Catálogo: slug/tenant, paginação, filtros, `Stock > 0`, StoreSettings público |
| P1-4 | Estoque: `StockMovement`, estorno em cancelamento, concorrência |
| P1-5 | Caixa: abertura/fechamento/movimentações |
| P1-6 | Carrinho persistido (guest/auth) |
| P1-7 | Service Layer para tirar regras dos controllers |
| P1-8 | Separar catálogo público (sem auth) da área admin |

### P2 — Pós-V1

| ID | Item |
|----|------|
| P2-1 | Separar Pedido/Venda/Pagamento (modelo) |
| P2-2 | Unicidade de clientes + validação de crédito + soft delete |
| P2-3 | `SellerId` no pedido + relatórios por vendedor |
| P2-4 | Upload com MIME/tamanho + múltiplas imagens |
| P2-5 | Paginação/pesquisa padronizada na API |
| P2-6 | Audit trail seletivo |
| P2-7 | Testes automatizados + CI |

### P3 — Estratégico

IA/Vendedor online real, CRM/comissões, marketplace, BI avançado, integrações externas (WhatsApp, gateways, ERPs).

---

## 10. O QUE NÃO FAZER AGORA

- CRM avançado, funil, automações.
- Marketplace multi-vendedor/split payments.
- PIM com variantes completas.
- Categorias hierárquicas profundas.
- Conciliação de caixa avançada.
- Soft delete generalizado.
- Reescrita da arquitetura — o modelo atual é evolutivo.

---

## 11. MÉTRICAS

| Métrica | Valor |
|---------|-------|
| Controllers | 7 |
| Models | 7 |
| DTOs | 7 (5 arquivos + 2 inline) |
| Migrations | 4 |
| Páginas frontend | 13 |
| Componentes de layout | 3 |
| Services | 7 |
| Testes automatizados | 0 |
| Workflows de CI | 0 |
| Entidades com `TenantId` | 0 |
| Problemas P0 em aberto | 8 |
| Problemas P0 resolvidos | 6 |

---

## 12. CONCLUSÃO

O ModaLink tem **base técnica sólida e MVP real de PDV single-tenant**. As correções recentes resolveram parte relevante dos bloqueadores (RBAC, integridade histórica, transação, secrets, Swagger, 401, Role/`IsActive` no auth, status do crediário e CORS).

O caminho para produção segura **não exige rebuild**. A sequência recomendada é:

1. **Fechar os P0 restantes de baixo esforço** (validação de DTOs, índices e rate limiting).
2. **Estabilizar concorrência de estoque** e tratar delete de produto.
3. **Construir multi-tenancy** antes de comercializar como SaaS.
4. Evoluir P1 (categorias, SKU, catálogo público, estoque, caixa, carrinho) e adicionar testes/CI.

> S1, S2 e S3 foram corrigidos. Ainda assim, o sistema **não deve ser exposto publicamente** enquanto faltarem multi-tenancy, rate limiting e validação de entrada.

---

*Relatório consolidado e atualizado em 28/10/2026. Substitui as auditorias anteriores.*
