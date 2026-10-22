# Auditoria Completa - ModaLink (Consolidada)

**Data:** 20/10/2026  
**Projeto:** ModaLink - SaaS para Lojas de Moda/Varejo  
**Stack:** .NET 8 + React 19 (Vite) + PostgreSQL 15 + Docker  
**Fonte:** Análise do código + Auditorias anteriores (AUDITORIA_MODATALINK.md + AUDITORIA2_MODALINK.md)

---

## SUMÁRIO EXECUTIVO

O ModaLink é uma plataforma SaaS para varejo com: **PDV (balcão), Catálogo público, Financeiro (crediário/parcelas), Relatórios e base para IA de vendas**.

**Status Geral:** MVP funcional para single-tenant, **NÃO PRONTO PARA PRODUÇÃO MULTI-TENANT**  
**Problemas Críticos:** 12+ (segurança, multi-tenancy, integridade)  
**Arquitetura:** Monolito em camadas simplificada (Controllers → EF Core) — evolucionável, não requer rebuild

---

## STACK TECNOLÓGICA

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React + TypeScript | 19.2.5 |
| Build | Vite | 8.0.10 |
| Estilo | Tailwind CSS | 4.2.4 |
| Roteamento | React Router DOM | 7.14.2 |
| HTTP Client | Axios | 1.16.0 |
| Gráficos | Recharts | 3.8.1 |
| Backend | ASP.NET Core | 8.0 |
| ORM | Entity Framework Core | 8.0.4 |
| Banco | PostgreSQL | 15 |
| Auth | JWT Bearer + BCrypt | - |
| API Docs | Swagger/Swashbuckle | - |
| Container | Docker Compose | - |

---

## ESTRUTURA DO PROJETO

```
modalink/
├── backend/ModaLink.Api/
│   ├── Controllers/          # 7 controllers
│   ├── Models/               # 7 entidades
│   ├── DTOs/                 # 5 DTOs (alguns no controller)
│   ├── Data/AppDbContext.cs  # Contexto EF Core
│   ├── Migrations/           # 4 migrations
│   ├── Program.cs            # Entry point
│   └── dockerfile            # Build multi-stage
├── frontend/modalink-frontend/
│   └── src/
│       ├── pages/            # 13 páginas
│       ├── components/       # 6 componentes
│       ├── services/         # 6 services API
│       ├── context/          # AuthContext
│       ├── hooks/            # useAuth
│       ├── types/            # Definições TypeScript
│       ├── layouts/          # MainLayout
│       └── routes/           # React Router
├── mobile/modalink-mobile/   # Expo (scaffold)
├── docker/docker-compose.yml # Stack completa
└── start.sh                  # Script deploy
```

---

## 1. MODELOS DE DADOS (BACKEND)

### Entidades Principais

| Entidade | Campos | Relacionamentos |
|----------|--------|-----------------|
| **User** | Id, Name, Email, PasswordHash, Role(string), IsActive, CreatedAt | Nenhum (auth global) |
| **Product** | Id, Title, Description, Price(18,2), ImageUrl?, Category?(string), Stock, CreatedAt, UpdatedAt | 1:N OrderItem |
| **Customer** | Id, Name, Email?, Phone?, WhatsApp?, Instagram?, BirthDate?, Notes?, Active, CreditLimit?, CreatedAt | 1:N Order |
| **Order** | Id, CustomerId?(nullable), PaymentMethod, Subtotal, Discount, Total(18,2), Status, CreatedAt, InstallmentCount?, DownPayment?, InterestRate? | N:1 Customer(SetNull), 1:N OrderItems, 1:N Installments |
| **OrderItem** | Id, OrderId, ProductId, Quantity, UnitPrice(18,2), TotalPrice(18,2) | N:1 Order(Cascade), N:1 Product(Cascade) |
| **Installment** | Id, OrderId, InstallmentNumber, Amount(18,2), DueDate, IsPaid, PaidAt?, PaidAmount?(18,2) | N:1 Order(Cascade) |
| **StoreSetting** | Id, StoreName, Phone?, Address?, LogoUrl?, UpdatedAt | Singleton |

### DTOs

| DTO | Localização | Observação |
|-----|------------|------------|
| LoginDto | `DTOs/LoginDto.cs` | OK |
| RegisterDto | `DTOs/Register.Dto.cs` | Nome com ponto |
| ProductCreateDto | `DTOs/ProductCreateDto.cs` | Usa IFormFile |
| CreateOrderDto | `DTOs/CreateOrderDto.cs` | OK |
| CreateCustomerDto | `Controllers/CustomersController.cs:180` | **Dentro do controller** |
| PayInstallmentDto | `Controllers/FinancesController.cs:151` | **Dentro do controller** |
| ChangePasswordDto | `DTOs/ChangePasswordDto.cs` | OK |

---

## 2. CONTROLLERS (BACKEND) - RESUMO

### AuthController (`/api/auth`)
- `POST /register` - Registro público (sem rate limit)
- `POST /login` - Login + JWT (7 dias expiração)
- `GET /me` - Usuário logado `[Authorize]`
- `POST /change-password` - Troca senha `[Authorize]`
- `GET /users` - **Admin apenas (comentário), mas só tem `[Authorize]`**
- `PATCH /users/{id}/toggle-active` - **Admin, mas só `[Authorize]`**
- `POST /users` - **Criar user admin, mas só `[Authorize]`**

### ProductsController (`/api/products`)
- `GET` - Público `[AllowAnonymous]` - retorna **TODOS** (sem paginação)
- `GET /{id}` - Público `[AllowAnonymous]`
- `POST` - `[Authorize]` - Upload imagem `[FromForm]`
- `PUT /{id}` - `[Authorize]` - Upload imagem duplicado
- `DELETE /{id}` - `[Authorize]`

### OrdersController (`/api/orders`) - `[Authorize]` em todos
- `GET` - Lista com busca + paginação implícita via query
- `GET /stats` - **Carrega TODOS pedidos na memória** (performance)
- `GET /{id}` - Detalhe completo com includes
- `POST` - Cria pedido + valida estoque + gera parcelas (crediário)

### CustomersController (`/api/customers`) - `[Authorize]`
- `GET` - Lista com agregações (TotalOrders, TotalSpent, TotalOwed)
- `GET /{id}` - Detalhe com orders + items + installments
- `POST` - Cria cliente
- `PUT /{id}` - Atualiza
- `DELETE /{id}` - Remove

### FinancesController (`/api/finances`) - `[Authorize]`
- `GET /receivable` - **Carrega TODAS parcelas** (performance)
- `GET /receivable/summary` - Resumo
- `POST /installments/{id}/pay` - Baixa parcela
- `POST /installments/{id}/unpay` - Reabre parcela
- `GET /customer/{customerId}` - Saldo do cliente

### StoreSettingsController (`/api/store-settings`) - `[Authorize]`
- `GET` - Retorna/cria config padrão
- `PUT` - Upsert

### ReportsController (`/api/reports`) - `[Authorize]`
- `GET /sales?period=` - Vendas por período
- `GET /summary` - Resumo do mês

---

## 3. FRONTEND - PÁGINAS E SERVIÇOS

### Páginas (13)
| Página | Rota | Descrição |
|--------|------|-----------|
| Login | `/login` | Autenticação |
| Register | `/register` | Registro |
| Dashboard | `/dashboard` | Stats + recentes + top produtos |
| Products | `/produtos` | Grid de produtos (admin) |
| CreateProduct | `/produtos/novo` | Cadastro com upload |
| Orders | `/pedidos` | Lista + modal detalhe |
| NovaVenda | `/vendas/nova` | **PDV completo** com carrinho, crediário, cliente |
| Clientes | `/clientes` | CRUD + métricas |
| Financeiro | `/financeiro` | Contas a receber (parcelas) |
| IAVendas | `/ia-vendas` | **100% Mock** (sem backend) |
| Catalogo | `/catalogo` | Catálogo interno (logado) |
| Reports | `/relatorios` | Gráficos (Recharts) |
| Settings | `/configuracoes` | Store settings + users + password |

### Services (6)
| Service | Endpoints |
|---------|-----------|
| api.ts | Axios base + interceptor auth + 401 redirect |
| productService.ts | GET/POST products |
| orderServices.ts | GET/POST orders |
| dashboardService.ts | GET /orders/stats |
| financeiroService.ts | GET receivable/summary, pay/unpay |
| reportsService.ts | GET /reports/sales |
| settingsService.ts | Store settings + users admin |

### Componentes Principais
- **PrivateRoute** - Protege rotas (redireciona para /login)
- **MainLayout** - Sidebar + TopBar + content
- **SideBar** - Navegação
- **TopBar** - Search (visual only), notificações (fake), user menu
- **OrderDetailModal** - Modal detalhes pedido
- **Card/Badge** - UI components (Card não usado)

---

## 4. PROBLEMAS CRÍTICOS DE SEGURANÇA

### 4.1 Secrets Hardcoded (CRÍTICO)
| Arquivo | Secret |
|---------|--------|
| `appsettings.json` | `Password=admin123` (PostgreSQL) |
| `appsettings.json` | `Jwt:Key=super-chave-ultra-secreta-modalink-123` |
| `docker-compose.yml` | `POSTGRES_PASSWORD: admin123` |
| `docker-compose.yml` | `PGADMIN_DEFAULT_PASSWORD: admin123` |
| `docker-compose.yml` | `Jwt__Key: CHAVE_SUPER_SEGURA_COM_PELO_MENOS_32_CARACTERES_AQUI!` |

**Correção:** Usar `.env` + variáveis de ambiente no docker-compose

### 4.2 CORS Aberto (CRÍTICO)
```csharp
// Program.cs:43-51
policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
```
**Risco:** CSRF - qualquer site pode fazer requests em nome do usuário

### 4.3 JWT Key Fraca + 7 dias sem Refresh Token
- Chave de 34 chars previsível
- Expiração 7 dias sem refresh token
- Sem blacklist no logout

### 4.4 Registro Aberto sem Rate Limiting
`POST /auth/register` público sem proteção

### 4.5 RBAC Não Implementado (CRÍTICO)
Endpoints "admin" têm apenas `[Authorize]`, **sem `[Authorize(Roles="Administrador")]`**:
- `GET /auth/users` - Qualquer user lista todos
- `POST /auth/users` - Qualquer user cria users
- `PATCH /auth/users/{id}/toggle-active` - Qualquer user desativa outros

### 4.6 Upload sem Validação
- Aceita qualquer extensão (.exe, .svg, .php)
- Sem limite de tamanho
- Lógica duplicada Create/Update

### 4.7 DTOs sem Validação
Nenhum DataAnnotation - Name vazio, Email inválido, Price negativo, etc.

### 4.8 Swagger em Produção
`ASPNETCORE_ENVIRONMENT=Development` no docker-compose habilita Swagger

### 4.9 HTTPS Desabilitado
`RequireHttpsMetadata = false`

---

## 5. PROBLEMAS DE ARQUITETURA E PERFORMANCE

### 5.1 Sem Service Layer
Controllers acessam `AppDbContext` diretamente → lógica misturada, difícil testar

### 5.2 Dashboard Carrega Tudo na Memória
```csharp
// OrdersController.cs:85-89
var orders = await _context.Orders
    .Include(o => o.Customer)
    .Include(o => o.Items).ThenInclude(i => i.Product)
    .ToListAsync();  // CARREGA TUDO
var totalSales = orders.Sum(o => o.Total);  // Calcula em C#
```

### 5.3 N+1 na Validação de Estoque
```csharp
foreach (var item in order.Items) {
    var product = await _context.Products.FindAsync(item.ProductId); // Query por item
}
```

### 5.4 Dois SaveChanges no Create Order
```csharp
_context.Orders.Add(order);
await _context.SaveChangesAsync();  // 1º
// decrementa estoque
await _context.SaveChangesAsync();  // 2º - se falhar, pedido criado sem estoque
```

### 5.5 Finances GetReceivable Carrega Tudo
```csharp
var installments = await _context.Installments
    .Include(i => i.Order).ThenInclude(o => o.Customer)
    .ToListAsync();  // TODAS as parcelas
```

### 5.6 Frontend - Busca sem Debounce
`Orders.tsx` faz request a cada letra digitada

### 5.7 App.tsx Código Morto
122 linhas de template Vite não usadas (main.tsx importa AppRoutes)

### 5.8 DTOs em Locais Inconsistentes
- `CreateCustomerDto` dentro de CustomersController
- `PayInstallmentDto` dentro de FinancesController

### 5.9 AppDbContext Namespace Errado
```csharp
namespace ModaLink.Api.Models; // Deveria ser ModaLink.Api.Data
```

---

## 6. PROBLEMAS DE INFRAESTRUTURA (DOCKER)

### 6.1 Frontend em Dev Mode no Docker
```yaml
command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
```
Deveria buildar estático + servir via nginx

### 6.2 Environment Development em Produção
```yaml
ASPNETCORE_ENVIRONMENT: Development
```

### 6.3 Sem .dockerignore
Copia `bin/`, `obj/`, `node_modules/`, `.git/` para container

### 6.4 Sem Health Checks no API/Frontend
PostgreSQL tem, mas API e Frontend não

### 6.5 Dois docker-compose.yml
- `docker/docker-compose.yml`
- `backend/ModaLink.Api/docker-compose.yml`
Quase idênticos, manutenção duplicada

### 6.6 wwwroot Pode Estar Versionado
Build do frontend copiado para `backend/wwwroot/` - se no git, versiona artifacts

---

## 7. MULTI-TENANCY - AUSENTE (BLOQUEADOR SAAS)

### Estado Atual
- **Zero** entidades com `TenantId`
- **Zero** filtro por tenant nas queries
- `StoreSetting` é singleton (uma loja por instância)
- Users globais (sem escopo de loja)
- Catálogo público retorna **TODOS** produtos (sem filtro)

### Entidades sem TenantId
| Entidade | TenantId | Risco |
|----------|----------|-------|
| User | Não | 🔴 Vazamento total |
| Product | Não | 🔴 Vazamento total |
| Customer | Não | 🔴 Vazamento total |
| Order | Não | 🔴 Vazamento total |
| OrderItem | Não | 🔴 Vazamento total |
| Installment | Não | 🔴 Vazamento total |
| StoreSetting | Não | 🟡 Global |

### Para SaaS Multi-tenant Precisa:
1. Adicionar `TenantId` em todas entidades de negócio
2. Derivar/validar tenant por request (header, subdomain, claim)
3. **Filtro global obrigatório** em TODAS queries (Global Query Filter EF Core)
4. Índices compostos `(TenantId, Id)`
5. Isolamento em Auth (users por tenant)

---

## 8. RBAC / IDENTIDADE

### Roles Existentes
- `Vendedor` (padrão no registro)
- `Administrador` (frontend usa, backend string livre)
- `Operador` (frontend define, backend não usa)

### Problemas
- `[Authorize]` sem verificação de role nos endpoints admin
- Role é string livre (sem enum/validação)
- Sem hierarquia Owner/Tenant
- Frontend tem tipos, backend não enforcement

---

## 9. FLUXO COMERCIAL - ANÁLISE

| Etapa | Status | Gaps |
|-------|--------|------|
| Produto (cadastro) | ✅ | Falta SKU, Status, Category entity |
| Estoque | ⚠️ | Sem movimentações, sem estorno cancelamento, race condition |
| Categorias | ⚠️ | String livre, sem entidade/CRUD |
| Catálogo Público | ⚠️ | Sem tenant/slug, sem paginação, sem filtro Stock>0 |
| Cliente | ⚠️ | Find-or-create por nome (duplicados), sem unicidade forte |
| Carrinho | ❌ | **Não existe API** - só estado local frontend |
| Pedido | ✅ | Transação não atômica (2 SaveChanges), cálculo juros duplicado FE/BE |
| Venda | ⚠️ | Implícita via Order.Status, sem entidade Sale separada |
| Pagamento | ⚠️ | Só Installments (crediário), à vista = Completed sem transação |
| Caixa | ❌ | **Ausente** (abertura/fechamento/sangrias) |
| Baixa Estoque | ⚠️ | Sem devolução automática cancelamento |

### Pedido vs Venda vs Pagamento
- **Não diferenciados explicitamente** - tudo em `Order`
- `Status = "Pending"` (crediário) ou `"Completed"` (à vista)
- Crediário gera `Installments` (contas a receber)
- À vista não gera registro de pagamento/transação

---

## 10. ESTOQUE - LIMITAÇÕES

| Item | Estado |
|------|--------|
| Estoque por produto | ✅ Campo único |
| Movimentações (entrada/saída/ajuste) | ❌ Ausente |
| Devolução/cancelamento devolve estoque | ❌ Não evidente |
| Estoque negativo prevenido | ⚠️ Race condition possível |
| Concorrência | ❌ Sem ConcurrencyToken |
| Reserva (carrinho/pedido pendente) | ❌ Não |

**Risco Crítico:** `OrderItem → Product` com `DeleteBehavior.Cascade` - deletar produto apaga itens de pedidos históricos (perda de integridade)

---

## 11. FINANCEIRO / CAIXA

### O que Existe
- Contas a receber (Installments) - foco crediário
- Baixa/reabertura de parcelas
- Totais: a receber, pago no mês, vencidos, a vencer
- Relatório de vendas básico

### O que NÃO Existe (Caixa/PDV Físico)
- CashRegister, CashOpening, CashClosing
- Movimentações de caixa (entradas/saídas avulsas)
- Tabela Payments (transações)
- Conciliação por forma de pagamento
- Sangrias/suprimentos

---

## 12. CATÁLOGO PÚBLICO - GAPS ESTRATÉGICOS

| Funcionalidade | Estado |
|----------------|--------|
| Público (AllowAnonymous) | ✅ |
| Identificação loja (slug/subdomínio) | ❌ |
| Tenant scoping | ❌ |
| Paginação | ❌ (ToListAsync completo) |
| Filtro Stock > 0 | ❌ |
| Filtros categoria/marca/preço | ❌ |
| Carrinho persistido | ❌ |
| Checkout público | ❌ |
| StoreSettings público | ❌ (endpoint [Authorize]) |
| Busca server-side | ❌ (só client-side) |
| Compartilhamento/WhatsApp | ❌ |

---

## 13. BANCO DE DADOS - RISCOS

### Schema Atual (7 tabelas)
- PKs: Identity (int)
- FKs: Corretas (SetNull, Cascade)
- Índices: **Apenas** `IX_StoreSettings_Id`
- Constraints: Básicas, **sem UNIQUE** (User.Email, Customer.Email/Phone)
- Decimais: `numeric(18,2)` correto
- Timestamps: `timestamp with time zone` (UTC)

### Riscos de Integridade
1. **OrderItem→Product Cascade Delete** - perde histórico de pedidos
2. **Sem UNIQUE em Users.Email** - race condition no registro
3. **Sem índices** - queries lentas com crescimento
4. **Sem ConcurrencyToken** - estoque/concorrência
5. **Sem TenantId** - impossível multi-tenant

---

## 14. FRONTEND - PROBLEMAS

| Problema | Arquivo | Impacto |
|----------|---------|---------|
| Tipos Auth incompletos (id:string vs number, falta role/isActive) | AuthContext.tsx | Bugs silenciosos, sem RBAC FE |
| Search no TopBar só visual | TopBar.tsx | UX quebrada |
| IAVendas 100% Mock | IAVendas.tsx | Feature fake |
| Reports botão "Tentar novamente" quebrado | Reports/index.tsx | Não recarrega |
| Notificações fake (ponto vermelho estático) | TopBar.tsx | UX enganosa |
| Card.tsx nunca usado | Card.tsx | Código morto |
| Catalogo/Products sem paginação | Catalogo.tsx, Products.tsx | Performance |
| useAuth() chamado sem uso | Financeiro.tsx:8, Clientes.tsx:17 | Warning |
| Export default inconsistente | Vários | Manutenibilidade |
| Estilo visual inconsistente | Páginas | Design system ausente |

---

## 15. IA / VENDEDOR ONLINE

**Estado:** Apenas frontend (`IAVendas.tsx`) com respostas hardcoded  
**Backend:** Nenhum controller/serviço  
**Viabilidade:** Arquitetura permite adicionar via composição (agente consome APIs REST existentes) sem rebuild, mas ideal extrair regras para Services/UseCases primeiro

---

## 16. O QUE PRESERVAR (🟢)

- Stack sólida e moderna (.NET 8 + React + PostgreSQL)
- Modelo domínio varejo genérico (reutilizável outros nichos)
- Lógica Crediário/Parcelas (valor real negócio)
- PDV (NovaVenda) funcional com validação estoque
- Catálogo público `[AllowAnonymous]` - base estratégica
- JWT + BCrypt adequados
- Docker Compose + Migrations automáticas
- Frontend bem organizado (rotas, layouts, services, auth)
- StoreSettings identidade básica
- Find-or-create cliente no PDV (agilidade)
- Separação Financeiro (recebíveis) vs Vendas
- Nomenclatura genérica (não acoplado a moda)

---

## 17. O QUE CORRIGIR - EVOLUÇÃO INCREMENTAL (🟡)

| Item | Prioridade | Esforço |
|------|------------|---------|
| Multi-tenancy base (TenantId + filtro global) | **P0** | Médio/Alto |
| RBAC enforcement (Authorize Roles) | **P0** | Baixo |
| Corrigir histórico (OrderItem→Product Restrict) | **P0** | Baixo |
| Transação atômica Order+Stock | **P0** | Baixo/Médio |
| Índices críticos DB | **P0** | Baixo |
| Categories (entidade + CRUD + tenant) | **P1** | Médio |
| Products: SKU + IsActive | **P1** | Baixo/Médio |
| Catálogo com slug/tenant + paginação + filtros | **P1** | Médio/Alto |
| Estoque: Movimentações + estorno + concorrência | **P1** | Médio |
| Caixa básico (abertura/fechamento/movimentações) | **P1** | Médio |
| Carrinho API (persistido) | **P1** | Médio |
| Unicidade Users/Customers + validação crédito | **P2** | Baixo |
| Vendedor (SellerId no Order) | **P2** | Baixo |
| Upload validação MIME/tamanho + múltiplas imagens | **P2** | Baixo/Médio |
| Paginação/pesquisa padronizada API | **P2** | Baixo |
| Soft delete seletivo + histórico auditável | **P2** | Médio |
| Interceptor 401 frontend (logout auto) | **P0** | Baixo |
| DTOs com DataAnnotations/FluentValidation | **P0** | Baixo |
| Rate limiting auth endpoints | **P0** | Médio |
| Secrets → .env + Docker secrets | **P0** | Baixo |
| CORS restrito | **P0** | Baixo |
| JWT: key forte + refresh token + expiração curta | **P0** | Médio |
| HTTPS obrigatório | **P0** | Baixo |
| Swagger só dev | **P0** | Baixo |
| Service Layer (extrair regras dos controllers) | **P1** | Alto |
| Frontend: separar catálogo público (sem auth) do admin | **P1** | Médio |

---

## 18. O QUE RECONSTRUIR (🔴) - NADA

**Nenhum módulo precisa rebuild do zero.** Projeto é **evolucionável incremental**.  
Maior gap (Multi-tenancy) = adição de campos + disciplina queries, não rewrite.

---

## 19. O QUE NÃO FAZER AGORA (P3 - Futuro)

- IA / Vendedor Online
- CRM avançado (funil, leads, automações)
- Marketplace (multi-vendedores, split payments)
- BI/Analytics avançado
- Integrações complexas (WhatsApp, gateways, ERPs, marketplaces)
- Workflows/automações complexas
- Categories hierárquicas profundas
- PIM avançado (variantes completas, múltiplas imagens)
- Caixa conciliação avançada
- Soft delete generalizado

---

## 20. DEFINIÇÃO MODALINK V1 (MVP SAAS)

| Módulo | Status | Ação |
|--------|--------|------|
| Multi-tenancy | 🔴 | Construir (P0) |
| Authentication | 🟢 | Pronto (add RBAC + refresh) |
| Users/Roles | 🟡 | Aplicar RBAC enforcement |
| Products | 🟡 | Add SKU, IsActive, Category FK |
| Categories | 🔴 | Construir entidade + CRUD + tenant |
| Stock | 🟡 | Movimentações, estorno, concorrência |
| Customers | 🟡 | Unicidade, validação crédito |
| POS/PDV | 🟢 | Pronto V1 |
| Cash/Caixa | 🔴 | Construir básico (P1) |
| Orders | 🟡 | Atomicidade, cancel+estorno, separação venda |
| Catalog | 🟡 | Slug/tenant, paginação, filtros, Stock>0, Settings público |
| Store Settings | 🟡 | Branding completo + público + flags |

---

## 21. ROADMAP TÉCNICO PRIORIZADO

### P0 - BLOQUEADORES (Risco/Viabilidade SaaS)
| # | Item | Risco | Esforço |
|---|------|-------|---------|
| P0-1 | **Multi-tenancy base** (TenantId + filtro global) | Alto | Médio/Alto |
| P0-2 | **RBAC enforcement** endpoints admin | Alto | Baixo |
| P0-3 | **Histórico pedidos** (OrderItem→Product Restrict) | Alto | Baixo |
| P0-4 | **Transação atômica** Order + Stock | Alto | Baixo/Médio |
| P0-5 | **Índices críticos** DB (FKs, CreatedAt, DueDate) | Médio-Alto | Baixo |
| P0-6 | **Secrets → .env** + CORS + JWT fix + HTTPS | Crítico | Baixo |
| P0-7 | **Rate limiting** auth | Alto | Médio |
| P0-8 | **DTOs validação** DataAnnotations | Alto | Baixo |
| P0-9 | **Frontend 401 interceptor** + Auth types fix | Alto | Baixo |

### P1 - V1 ESSENCIAL (Lançamento)
| # | Item | Esforço |
|---|------|---------|
| P1-1 | Categories entidade + CRUD + tenant | Médio |
| P1-2 | Products: SKU (unique/tenant) + IsActive | Baixo/Médio |
| P1-3 | Catálogo: slug/tenant + paginação + filtros + Stock>0 + StoreSettings público | Médio/Alto |
| P1-4 | Estoque: StockMovement + estorno cancelamento + concorrência | Médio |
| P1-5 | Caixa básico: abertura/fechamento/movimentações | Médio |
| P1-6 | Carrinho API (guest/auth) | Médio |

### P2 - MELHORIAS PÓS-V1
| # | Item | Esforço |
|---|------|---------|
| P2-1 | Separação Pedido/Venda/Pagamento (modelo) | Médio/Alto |
| P2-2 | Clientes: unicidade + validação crédito + soft delete | Baixo |
| P2-3 | Vendedor (SellerId) + relatórios | Baixo |
| P2-4 | Upload: MIME/tamanho + múltiplas imagens | Baixo/Médio |
| P2-5 | Paginação/pesquisa padronizada API | Baixo |
| P2-6 | Soft delete + audit trail seletivo | Médio |

### P3 - ESTRATÉGICO (Futuro)
| # | Item | Esforço |
|---|------|---------|
| P3-1 | IA/Vendedor Online (agente consome APIs) | Alto |
| P3-2 | CRM + Comissões + Marketplace | Alto |
| P3-3 | BI avançado + Integrações externas | Alto |

---

## 22. FLUXO FINAL DE VALIDAÇÃO (E-COMMERCE + PDV)

| Etapa | Suportado? | Gap |
|-------|------------|-----|
| Loja cadastra Produto | ✅ | Falta SKU/Status/Categoria entidade |
| Produto aparece no Catálogo | ⚠️ | Sem tenant/slug, Stock<=0 aparece |
| Cliente acessa Link da Loja | ❌ | Sem `/catalogo/:slug` ou subdomínio |
| Cliente escolhe Produto | ✅ | - |
| Carrinho | ❌ | **Sem API** (só localStorage) |
| Pedido (Checkout) | ⚠️ | Exige auth (PDV admin), público não suportado |
| Loja recebe Pedido | ✅ | Admin vê lista |
| Venda | ⚠️ | Implícita (Status), sem entidade Sale |
| Pagamento | ⚠️ | À vista = Completed sem transação; Crediário = Installments |
| Caixa | ❌ | **Ausente** |
| Estoque Atualizado | ⚠️ | Sem estorno cancelamento, sem movimentação, sem reserva |

**Veredito:** Suporta **PDV balcão (admin logado)** + **Catálogo leitura pública**.  
**NÃO suporta** e-commerce público completo (catálogo→carrinho→pedido→pagamento sem auth + multi-loja + caixa).

---

## 23. MÉTRICAS DA AUDITORIA

| Métrica | Valor |
|---------|-------|
| Controllers auditados | 7 |
| Models auditados | 7 |
| DTOs auditados | 7 (5 arquivos + 2 inline) |
| Pages frontend auditadas | 13 |
| Components auditados | 6 |
| Services auditados | 7 |
| Problemas totais identificados | 60+ |
| Críticos segurança | 12 |
| Problemas performance | 7 |
| Code smells | 10 |
| Ausência boas práticas | 12 |
| Multi-tenancy gaps | 9 (todas entidades) |

---

## 24. ARQUIVOS CHAVE PARA REFERÊNCIA RÁPIDA

### Backend
- `Program.cs` - Configuração app, CORS, JWT, migrations
- `AuthController.cs` - Auth + users admin (sem RBAC)
- `ProductsController.cs` - CRUD + upload duplicado
- `OrdersController.cs` - Pedidos + stats (performance) + crediário
- `CustomersController.cs` - Clientes + métricas
- `FinancesController.cs` - Recebíveis (performance)
- `StoreSettingsController.cs` - Config loja
- `ReportsController.cs` - Relatórios
- `AppDbContext.cs` - Config EF + relationships
- `Models/*.cs` - 7 entidades
- `DTOs/*.cs` - DTOs

### Frontend
- `main.tsx` - Entry + AuthProvider
- `routes/index.tsx` - Rotas + ProtectedLayout
- `context/AuthContext.tsx` - Auth state (tipos incompletos)
- `services/api.ts` - Axios + interceptors
- `pages/Dashboard.tsx` - Stats + recentes + top
- `pages/vendas/NovaVenda.tsx` - **PDV completo**
- `pages/Orders.tsx` - Lista + modal detalhe
- `pages/clientes/Clientes.tsx` - CRUD clientes
- `pages/financeiro/Financeiro.tsx` - Contas a receber
- `pages/Products.tsx` - Grid produtos
- `pages/catalogo/Catalogo.tsx` - Catálogo interno

### Infra
- `docker/docker-compose.yml` - Stack completa
- `backend/ModaLink.Api/dockerfile` - Multi-stage build

---

## 25. CONCLUSÃO FINAL

O ModaLink tem **base técnica sólida e MVP funcional para PDV single-tenant**. O código é limpo, pragmático e **evolutionável**.

**Bloqueadores para SaaS Multi-tenant Comercial:**
1. **Multi-tenancy ausente** (modelo dados + queries + auth)
2. **Segurança crítica** (secrets, CORS, RBAC, upload, validação)
3. **Integridade histórica** (Cascade Delete OrderItem→Product)
4. **Atomicidade** (Order + Stock em transação única)

**Recomendação:** Corrigir **P0 (9 itens)** em ~2 semanas → lança V1 single-tenant seguro → depois **P1 (6 itens)** para multi-tenant + catálogo público real + caixa.

**Não reconstruir nada.** Refatorar incrementalmente. A arquitetura Controller→EF permite extrair Services/UseCases gradualmente sem quebrar funcionalidades existentes.

---

*Relatório consolidado gerado em 20/10/2026*