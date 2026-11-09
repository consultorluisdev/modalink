# Auditoria Técnica — ModaLink

**Última revisão:** 09/11/2026
**Projeto:** ModaLink — PDV + Gestão + Crediário para lojas de moda/varejo
**Stack:** .NET 8 + React 19 (Vite) + PostgreSQL 15 + Docker
**Escopo:** código atual do repositório (`backend/ModaLink.Api`, `frontend/modalink-frontend`, `docker/`, `mobile/`)
**Base:** revisão sobre os commits `5c96cf60`, `ff3308ff` e `ce28ab0b` (financeiro, clientes e login).
**Documento único:** consolida e substitui as auditorias anteriores.

> **Legenda de status**
> ✅ Implementado · 🟡 Parcial / com ressalvas · 🔴 Ausente ou quebrado
>
> **Legenda de prioridade**
> **P0** bloqueador de segurança/viabilidade · **P1** essencial para V1 · **P2** melhoria pós-V1 · **P3** estratégico

---

## 1. SUMÁRIO EXECUTIVO

O ModaLink é um **MVP funcional de PDV single-tenant** com catálogo, crediário, financeiro e relatórios. A base continua sólida e evolutiva (Controllers → EF Core), **sem necessidade de rewrite**.

**Veredito:** pronto para uso interno de **uma loja**, com ressalvas de segurança; **não pronto** para exposição pública nem para SaaS multi-tenant.

### Verificações executadas nesta revisão

| Verificação | Resultado |
|-------------|-----------|
| `dotnet build` (backend) | ✅ 0 erros, 0 avisos |
| `tsc --noEmit` (frontend) | ✅ 0 erros |
| `npm run lint` | ✅ 0 erros |
| `npm run build` | 🔴 falha local por `node_modules` pertencer a `root` (`EACCES`) — problema de ambiente/Docker, não de código |

### O que mudou desde a auditoria de 28/10/2026

| Item | Antes | Agora | Evidência |
|------|-------|-------|-----------|
| Tela de Login realmente autenticando | 🔴 `Login` era só visual | ✅ `LoginRoute` chama `/auth/login` e persiste sessão | `routes/index.tsx:30-68` |
| `baseURL` do Axios | 🔴 fixa em `http://host:5020` | 🟡 condicional DEV/`/api` (produção ok; DEV ignora proxy) | `services/api.ts:4-6` |
| Financeiro | 🟡 básico | ✅ reescrito (busca, filtros, detalhe, baixar/reabrir) | `financeiro/Financeiro.tsx` |
| Clientes | 🟡 só listagem | ✅ reescrito (criar, editar, busca, detalhe, totais) | `clientes/Clientes.tsx` |
| Menu → Catálogo | ✅ `/catalogo` | 🔴 aponta para rota inexistente | `SideBar.tsx:32` |
| Retry de Relatórios | 🔴 no-op | 🔴 continua no-op | `Reports/index.tsx:69,99` |
| Registro público força `Vendedor` | ✅ | ✅ (mas ver novo risco R1) | `AuthController.cs:36` |
| Login bloqueia inativo | ✅ | ✅ | `AuthController.cs:57` |

### Top riscos atuais (P0)

1. 🔴 **Registro público aberto + RBAC fraco** — qualquer pessoa cria um `Vendedor` e passa a ler clientes, pedidos e financeiro. Ver **R1**.
2. 🔴 **Validação de entrada ausente** — senha vazia, quantidade/preço negativos, desconto > subtotal, parcelas inválidas. Ver **R2**.
3. 🔴 **Multi-tenancy ausente** — uma instância = uma loja; sem isolamento de dados.
4. 🔴 **Rate limiting ausente** — brute force em login/registro.
5. 🟡 **Concorrência de estoque** — validação fora da transação; dois pedidos podem vender o mesmo item.
6. 🟡 **JWT de 7 dias sem refresh/revogação** — desativar usuário não invalida tokens já emitidos.

### Novas regressões introduzidas nos últimos commits

| # | Severidade | Regressão | Evidência |
|---|------------|-----------|-----------|
| R1 | 🔴 P0 | Menu aponta para `/gestor da loja on-line`, rota que não existe; página Catálogo ficou inacessível pelo menu e o clique renderiza tela em branco | `SideBar.tsx:32` vs `routes/index.tsx:82` |
| R2 | 🔴 P0 | Cadastro público + endpoints de escrita abertos a qualquer autenticado permitem que um estranho crie conta e acesse dados da loja | `AuthController.cs:25-46`, `ProductsController.cs:26`, `CustomersController.cs:125` |
| R3 | 🟡 P1 | `npm run build` falha localmente: `node_modules` e `.tmp` pertencem a `root` (criados pelo container de dev) | `frontend/modalink-frontend/node_modules` |
| R4 | 🟡 P1 | Comentário "Gestor da Loja On-line" sugere feature nova, mas não há página/rota/backend | `SideBar.tsx:32` |
| R5 | 🟡 P2 | `baseURL` em DEV usa `http://${hostname}:5020` e ignora o proxy do Vite (`/api`), contrariando `vite.config.ts` | `services/api.ts:4-6` vs `vite.config.ts:8-12` |

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
│   ├── src/components/    3 componentes de layout + 3 UI
│   ├── src/services/      7 arquivos (6 domínios + api)
│   ├── src/context/       AuthContext
│   ├── src/hooks/         useAuth
│   ├── src/types/         order.types
│   ├── src/layouts/       MainLayout
│   └── src/routes/        React Router
├── mobile/modalink-mobile/  apenas scaffold (node_modules/.expo, sem fonte)
├── docker/docker-compose.yml
├── backend/ModaLink.Api/docker-compose.yml  (duplicado)
└── start.sh
```

**Padrão:** monolito em camadas simplificado. Controllers acessam `AppDbContext` diretamente; **não há Service Layer, Domain nem Repositories**.

### O que preservar (🟢)

- Stack moderna e estável (.NET 8 + React 19 + PostgreSQL + Docker).
- Modelo de domínio genérico de varejo (não acoplado a “moda”).
- Crediário com parcelas, entrada e juros simples — lógica de negócio real.
- PDV (`NovaVenda`) funcional com carrinho e validação de estoque no servidor.
- Catálogo com `GET /api/products` `[AllowAnonymous]`.
- JWT + BCrypt, migrations automáticas, SPA fallback.
- Organização do frontend (rotas, layouts, services, context).
- Financeiro e Clientes reescritos com boa UX (busca, filtros, detalhe, ações).

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
| Delete de produto com histórico | 🟡 | FK `Restrict` (`AppDbContext.cs:47`) impede apagar produto vendido, mas `DELETE /api/products/{id}` (`ProductsController.cs:113-124`) não trata o erro → retorna **500** |
| Delete de cliente com histórico | 🟡 | `SetNull` (`AppDbContext.cs:30-33`) apaga o vínculo do pedido; o financeiro perde o nome do cliente e o histórico fica órfão sem aviso |
| Unicidade de e-mail | 🔴 | `User.Email` e `Customer.Email` sem `UNIQUE`; corrida no registro |
| Índices | 🔴 | Apenas índices de FK já gerados e `IX_StoreSettings_Id`; sem índices em `CreatedAt`, `DueDate` |
| Concorrência de estoque | 🔴 | Sem `ConcurrencyToken`/lock; dois pedidos podem passar na validação juntos |
| Consistência pedido × parcelas | 🔴 | `Order.Total` **não inclui juros nem desconta entrada**, mas as parcelas incluem juros. `Total` do pedido ≠ soma das parcelas; entrada não é registrada |
| Multi-tenant | 🔴 | Nenhuma entidade possui `TenantId` |
| Escala | 🟡 | PKs `int` Identity; adequado ao porte inicial, não a SaaS de grande volume |

---

## 4. API — MAPA E SEGURANÇA

### AuthController (`/api/auth`)

| Endpoint | Acesso | Observação |
|----------|--------|------------|
| `POST /register` | público | ✅ força `Role = "Vendedor"`; 🔴 **aberto**, sem validação de senha/e-mail |
| `POST /login` | público | ✅ bloqueia inativo; 🟡 enumera usuário; 🔴 sem rate limit |
| `GET /me` | autenticado | ✅ |
| `POST /change-password` | autenticado | ✅ valida senha atual e mínimo de 6 |
| `GET /users` | Administrador | ✅ `AuthController.cs:123` |
| `PATCH /users/{id}/toggle-active` | Administrador | ✅ `AuthController.cs:142` |
| `POST /users` | Administrador | ✅ `AuthController.cs:156` |

### Demais controllers

- **ProductsController** (`/api/products`): `GET`/`GET{id}` públicos; `POST`/`PUT`/`DELETE` autenticados (qualquer role). Sem paginação (`ToListAsync` em `ProductsController.cs:22`). Upload duplicado em Create/Update, sem validação de tipo/tamanho.
- **OrdersController** (`/api/orders`, `[Authorize]`): lista com busca, `GET /stats`, detalhe, criação. `GET /stats` carrega **todos** os pedidos e itens em memória (`OrdersController.cs:52-58`).
- **CustomersController** (`/api/customers`, `[Authorize]`): CRUD + métricas. `CreateCustomerDto` declarado dentro do controller (`CustomersController.cs:181`).
- **FinancesController** (`/api/finances`, `[Authorize]`): recebíveis, resumo, baixar/reabrir parcela, saldo por cliente. Carrega **todas** as parcelas (`FinancesController.cs:21-25`).
- **StoreSettingsController** (`/api/store-settings`, `[Authorize]`): singleton; sem endpoint público para branding/catálogo.
- **ReportsController** (`/api/reports`, `[Authorize]`): vendas por período e resumo mensal.

### Achados de segurança

| # | Severidade | Achado | Evidência |
|---|------------|--------|-----------|
| S1 | ✅ P0 | Registro público força `Role = "Vendedor"` | `AuthController.cs:36` |
| S2 | ✅ P0 | Login bloqueia usuário inativo | `AuthController.cs:57` |
| S3 | ✅ P0 | CORS restrito a `Cors:AllowedOrigins` | `Program.cs:47-49` |
| S4 | 🔴 P0 | Sem rate limiting em login/registro | `Program.cs` |
| S5 | 🔴 P0 | DTOs sem `DataAnnotations` (senha vazia, preço/quantidade negativos, e-mail inválido, desconto > subtotal) | `DTOs/*`, DTOs inline |
| S6 | 🔴 P0 | **Registro público aberto**: qualquer visitante cria conta `Vendedor` e acessa dados da loja (endpoints de leitura/escrita só exigem autenticação) | `AuthController.cs:25-46`, `CustomersController.cs:9` |
| S7 | 🟡 P1 | JWT expira em 7 dias fixos, ignorando `ExpirationHours: 2`; sem refresh/revogação | `AuthController.cs:205`, `appsettings.json:18` |
| S8 | 🟡 P1 | `isActive` é gravado no token mas **nunca validado**; usuário desativado continua com acesso até o token expirar | `AuthController.cs:197`, `Program.cs:27-36` |
| S9 | 🟡 P1 | HTTPS não obrigatório (`RequireHttpsMetadata=false`, sem `UseHttpsRedirection`) | `Program.cs:24` |
| S10 | 🟡 P1 | Upload sem validação de MIME/tamanho e sem limite; extensão do nome original (risco de SVG/HTML servido de `wwwroot/uploads`) | `ProductsController.cs:26-47`, `:92-107` |
| S11 | 🟡 P1 | Role é string livre (sem enum/validação); `Operador` existe na UI e não tem regra no backend | `User.cs:8`, `Settings/index.tsx:328` |
| S12 | 🟡 P2 | Login revela existência de e-mail ("Usuário não encontrado") | `AuthController.cs:55-56` |
| S13 | 🟡 P2 | Sem autorização por role nas escritas de produtos/clientes/financeiro; qualquer autenticado apaga produto e baixa parcela | `ProductsController.cs:26`, `CustomersController.cs:125`, `FinancesController.cs:86` |
| S14 | 🟢 | Secrets fora do repositório; `.env` ignorado e **não rastreado** | `.env`, `.gitignore:2` |
| S15 | 🟢 | Swagger habilitado apenas em Development | `Program.cs:63-66` |

> **Ação imediata recomendada:** S4, S5, S6 e S8 antes de qualquer exposição pública. Enquanto S6 existir, tratar o sistema como **não público**.

---

## 5. FRONTEND

### Páginas (13)

| Página | Rota | Estado |
|--------|------|--------|
| Login | `/login` | ✅ agora autentica de verdade (`LoginRoute`) |
| Register | `/register` | 🟡 funcional, mas registro público é risco (S6) |
| Dashboard | `/dashboard` | 🟡 "Vendas (mês)" mostra total geral, não do mês |
| Products / CreateProduct | `/produtos`, `/produtos/novo` | ✅ |
| Orders | `/pedidos` | 🟡 busca sem debounce (request a cada tecla) |
| NovaVenda (PDV) | `/vendas/nova` | 🟡 carrinho local; não valida estoque no cliente |
| Clientes | `/clientes` | ✅ reescrita (CRUD + busca + detalhe) |
| Financeiro | `/financeiro` | ✅ reescrita (filtros + baixa/reabertura) |
| Catálogo | `/catalogo` | 🔴 rota existe, mas o menu aponta para rota inválida |
| Reports | `/relatorios` | 🔴 “Tentar novamente”/“Atualizar” não refazem a busca (`setPeriod(p => p)`) |
| Settings | `/configuracoes` | 🟡 chama endpoints admin para qualquer role; sem RBAC na UI |
| IAVendas | `/ia-vendas` | 🔴 100% mock |
| Gestor da Loja On-line | — | 🔴 item de menu sem rota/página (regressão R1) |

### Services (7)

`api.ts` (Axios + token + 401), `productService`, `orderServices`, `dashboardService`, `financeiroService`, `reportsService`, `settingsService`.

### Problemas

| Problema | Impacto |
|----------|---------|
| Menu aponta para `/gestor da loja on-line` | Item quebra navegação e deixa Catálogo inacessível (`SideBar.tsx:32`) |
| `baseURL` em DEV ignora o proxy do Vite | Dependência de `:5020` acessível e de CORS; contraria `vite.config.ts` |
| Sem RBAC na UI | Vendedor vê Configurações e recebe 403 ao carregar usuários |
| `App.tsx` ainda é o template Vite (código morto) | Confusão/manutenção |
| TopBar: busca apenas visual e notificação falsa | UX enganosa (`TopBar.tsx:28-41`) |
| Sem debounce em buscas (Orders) | Requests a cada tecla |
| Catálogo/Produtos sem paginação | Performance com crescimento |
| `useAuth()` chamado sem uso em Clientes | Warning/lint (`Clientes.tsx:40`) |
| Reports retry/refresh inoperante | Usuário fica preso no estado de erro |
| `node_modules` do frontend pertence a `root` | `npm run build` local falha com `EACCES` |

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
| Pagamento | 🟡 | Só crediário via `Installment`; à vista não gera registro de pagamento; entrada não é registrada |
| Baixa de parcela | 🟡 | Não valida valor, não impede pagar duas vezes nem valor negativo; **não atualiza `Order.Status`** |
| Caixa | 🔴 | Sem abertura/fechamento/sangria/suprimento |
| Baixa de estoque | 🟡 | Decrementa na venda, mas não há devolução em cancelamento |
| Vendedor | 🔴 | Sem `SellerId` no pedido |

### Bugs de fluxo confirmados

| Bug | Evidência |
|-----|-----------|
| Validação de estoque ocorre **antes** da transação e não é revalidada dentro dela | `OrdersController.cs:234-262` |
| Estoque relido item a item dentro da transação (N+1) | `OrdersController.cs:251` |
| Cliente duplicado quando nome difere por espaço/acento | `OrdersController.cs:157-174` |
| Pedido continua `Pending` mesmo após todas as parcelas pagas | `FinancesController.cs:86-100` |
| `Order.Total` não inclui juros/entrada, mas parcelas incluem → totais divergentes | `OrdersController.cs:177-232` |
| `totalPaidThisMonth` ignora o ano (conta meses homônimos de anos anteriores) | `FinancesController.cs:29` |
| Delete de cliente deixa pedidos sem vínculo (`SetNull`) sem aviso | `AppDbContext.cs:30-33` |
| `GET /orders/stats` carrega todos os pedidos/itens em memória | `OrdersController.cs:52-58` |
| `GET /finances/receivable` carrega todas as parcelas em memória | `FinancesController.cs:21-25` |
| `StoreSettings` cria singleton sem constraint; concorrência pode duplicar | `StoreSettingsController.cs:22-33` |

---

## 8. INFRAESTRUTURA E DEVOPS

| Item | Status | Detalhe |
|------|--------|---------|
| Artefatos de build no Git | 🔴 | 181 arquivos de `bin/`, `obj/` e `wwwroot/` rastreados apesar do `.gitignore`; sujam o diff e inflam o repo |
| Compose | 🟡 | Dois arquivos quase idênticos: `docker/docker-compose.yml` e `backend/ModaLink.Api/docker-compose.yml` |
| Frontend no Docker | 🔴 | `npm run dev -- --host 0.0.0.0` em vez de build estático + nginx; cria `node_modules` como `root` |
| `.dockerignore` | 🔴 | Ausente; copia `bin/`, `obj/`, `node_modules` |
| Healthchecks | 🟡 | Só PostgreSQL; API e frontend não têm. Healthcheck hardcoda `admin/modalink_db` |
| Portas pgAdmin | 🟡 | 5051 no compose de `docker/`, 5050 no de `backend/`; `start.sh` anuncia 5050 |
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
| P0-2 | Validar `IsActive` no login | ✅ | — |
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
| P0-15 | **Restringir registro público (convite/desabilitar) e/ou RBAC nas escritas** | 🔴 | Baixo/Médio |
| P0-16 | **Validar `isActive` em cada request (revogação de token)** | 🔴 | Baixo |
| P0-17 | **Corrigir menu `/gestor da loja on-line` → `/catalogo`** | 🔴 | Baixo |

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
| P1-9 | Corrigir `Order.Status` ao quitar parcelas + registrar entrada |
| P1-10 | Corrigir retry/refresh de Relatórios e RBAC na UI |
| P1-11 | Build de produção do frontend (nginx) e `.dockerignore` |
| P1-12 | Remover artefatos de build do Git (`git rm -r --cached`) |

### P2 — Pós-V1

| ID | Item |
|----|------|
| P2-1 | Separar Pedido/Venda/Pagamento (modelo) |
| P2-2 | Unicidade de clientes + validação de crédito + soft delete |
| P2-3 | `SellerId` no pedido + relatórios por vendedor |
| P2-4 | Upload com MIME/tamanho + múltiplas imagens |
| P2-5 | Paginação/pesquisa padronizada na API |
| P2-6 | Audit trail seletivo (quem baixou parcela/alterou preço) |
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
| Componentes de layout/UI | 6 |
| Services | 7 |
| Testes automatizados | 0 |
| Workflows de CI | 0 |
| Entidades com `TenantId` | 0 |
| Artefatos de build rastreados | 181 |
| Problemas P0 em aberto | 10 |
| Problemas P0 resolvidos | 6 |

---

## 12. CONCLUSÃO

O ModaLink tem **base técnica sólida e MVP real de PDV single-tenant**. As correções recentes melhoraram bastante o Financeiro, o Clientes e o Login, mas os últimos commits também **introduziram uma regressão de navegação** (menu apontando para rota inexistente) e **não fecharam os buracos de segurança de entrada**.

O caminho para produção segura **não exige rebuild**. A sequência recomendada é:

1. **Corrigir a regressão do menu** (`/gestor da loja on-line` → `/catalogo`).
2. **Fechar os P0 de segurança**: restringir registro público, validar DTOs, adicionar rate limiting e validar `isActive` em cada request.
3. **Corrigir consistência financeira**: status do pedido ao quitar parcelas, entrada, juros e `totalPaidThisMonth`.
4. **Estabilizar concorrência de estoque** e tratar delete de produto.
5. **Construir multi-tenancy** antes de comercializar como SaaS.
6. Evoluir P1 (categorias, SKU, catálogo público, estoque, caixa, carrinho), limpar artefatos do Git e adicionar testes/CI.

> O sistema **não deve ser exposto publicamente** enquanto faltarem: registro controlado, rate limiting, validação de entrada, revogação de token e multi-tenancy.

---

*Relatório consolidado e atualizado em 09/11/2026. Substitui as auditorias anteriores.*
