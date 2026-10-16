# MODALINK — AUDITORIA 2
## ARQUITETURA, DOMÍNIO, SAAS, PRODUTO E FLUXOS DE NEGÓCIO

**Modo:** Auditoria (leitura/planejamento).  
**Data:** 07/10/2026  
**Base:** Código existente (backend .NET 8 + frontend React/Vite + PostgreSQL)

> Esta auditoria é complementar à auditoria técnica anterior. Os problemas técnicos já levantados não são repetidos. Foco em arquitetura de produto, domínio e fluxos de negócio.

---

## 1. MAPA REAL DA ARQUITETURA

### 1.1 Visão geral (existente)

Camadas reais (conforme código):

```text
Frontend (React + Vite + TS)
  ↓ (Axios - Bearer JWT)
API (ASP.NET Core 8 - Controllers)
  ↓ (DbContext)
EF Core 8.0.4
  ↓
PostgreSQL 15
```

### 1.2 Entidades (Models)

| Entidade | Campos relevantes | Relacionamentos |
|---|---|---|
| `User` | Id, Name, Email, PasswordHash, Role, IsActive, CreatedAt | Sem FKs explícitas (autenticação/usuários do sistema) |
| `Product` | Id, Title, Description, Price (decimal 18,2), ImageUrl?, Category?, Stock, CreatedAt, UpdatedAt | Usado por `OrderItem` (Product FK) |
| `Customer` | Id, Name, Email?, Phone?, WhatsApp?, Instagram?, BirthDate?, Notes?, Active, CreditLimit?, CreatedAt | 1:N com `Order` |
| `Order` | Id, CustomerId? (nullable), PaymentMethod, Subtotal, Discount, Total (18,2), Status, CreatedAt, InstallmentCount?, DownPayment?, InterestRate? | N:1 Customer (SetNull), 1:N OrderItems, 1:N Installments |
| `OrderItem` | Id, OrderId, ProductId, Quantity, UnitPrice (18,2), TotalPrice (18,2) | N:1 Order (Cascade), N:1 Product (Cascade) |
| `Installment` | Id, OrderId, InstallmentNumber, Amount (18,2), DueDate, IsPaid, PaidAt?, PaidAmount? (18,2) | N:1 Order (Cascade) |
| `StoreSetting` | Id, StoreName, Phone?, Address?, LogoUrl?, UpdatedAt | Entidade singleton (único registro esperado) |

### 1.3 Controllers, DTOs e Contexto

| Camada | Itens encontrados |
|---|---|
| Controllers | `AuthController`, `ProductsController`, `CustomersController`, `OrdersController`, `StoreSettingsController`, `FinancesController`, `ReportsController` (7) |
| DTOs | `LoginDto`, `RegisterDto`, `ChangePasswordDto`, `ProductCreateDto` (arquivo separado), `CreateOrderDto` (definido em/consumido por Orders), `CreateCustomerDto` (dentro de CustomersController), `PayInstallmentDto` (dentro de FinancesController) |
| DbContext | `AppDbContext` (Models namespace). Configura precisão decimal, relacionamentos, índices (`StoreSettings.Id` indexado). |
| Migrations | 20260531015629_InitialCreate, 20260531020744_AddUsersTable, 20260531022749_AddInstallments, 20260630141300_AddUserRoleAndStoreSettings. |

### 1.4 Frontend (mapa)

| Área | Estrutura existente |
|---|---|
| Páginas | Login, Register, Dashboard, Products, CreateProduct, catalogo/Catalogo, orders/Orders, vendas/NovaVenda, clientes/Clientes, financeiro/Financeiro, ia-vendas/IAVendas, Reports, Settings |
| Componentes | PrivateRoute, SideBar, TopBar, MainLayout |
| Context/Hooks | AuthContext, useAuth |
| Services | api.ts, productService.ts, orderServices.ts, dashboardService.ts, financeiroService.ts, reportsService.ts, settingsService.ts |
| Rotas | AppRoutes com BrowserRouter, ProtectedLayout (PrivateRoute + MainLayout), redirect "/" → "/dashboard" |

### 1.5 Onde estão as regras de negócio

**Local predominante:** Controllers (lógica orquestrada diretamente neles).

Exemplos (comprovados):

- `AuthController`: geração JWT (claims: Sub, Email, UniqueName, Role, isActive, Jti), expiração (7 dias), validação senha (BCrypt).
- `ProductsController`: upload de imagem ([FromForm]), criação de pasta `wwwroot/uploads`, geração GUID + extensão, definição `ImageUrl = "/uploads/" + filename` (duplicado Create/Update).
- `OrdersController`: find-or-create de Customer (por nome), cálculo `subtotal = sum(quantity*unitPrice)`, `total = subtotal - discount`, definição `Status = PaymentMethod == "Crediário" ? "Pending" : "Completed"`, geração de parcelas (juros simples: `totalWithInterest = amountToFinance * (1 + rate * installmentCount/100)`, rate em %/mês, arredondamento + ajuste da última parcela), validação de estoque (antes de salvar), decremento de estoque (após salvar), projeções com Includes/ThenIncludes.
- `FinancesController`: cálculos de a receber/pagos/vencidos, ações pay/unpay (atualiza IsPaid, PaidAt, PaidAmount).
- `CustomersController`: agrega TotalOrders, TotalSpent, TotalOwed (soma de parcelas não pagas).

**Domínio/Serviços:** Não foi possível confirmar na auditoria a existência de camada de Domínio, Application Services, Repositories ou CQRS. Não há pastas `Services/Domain/Application` no backend. Regras estão acopladas a Controllers + EF.

**Conclusão (1):** Arquitetura atual é **monolítica em camadas simplificada (Controller → EF)**, pragmática, com regras de negócio concentradas nos controllers. Não há separação estrita Domain/Core isolado. É adequada para MVP, mas não estruturada como Core genérico desacoplado por domínio.

## 2. MULTI-TENANCY — AUDITORIA PROFUNDA

### 2.1 Existência de Tenant

**Não foi possível confirmar na auditoria** a existência de conceito de Tenant (multi-tenancy) no código.

- Nenhuma entidade possui `TenantId` (verificado Models, Controllers, Data, Migrations).
- Nenhuma referência a `Tenant`, `tenants`, `multitenant`, `multi-tenant` encontrada no código-fonte (excluídos binários).
- `StoreSetting` é único (Id, sem identificação de loja/multi-tenant). Sugere **single-tenant por instância** (ou configuração global da loja única).
- `User`, `Product`, `Customer`, `Order`, `OrderItem`, `Installment` **não possuem TenantId**.

### 2.2 Análise por entidade

| Entidade | TenantId | Quem define? | Quem valida? | Filtra por TenantId? | Isolamento | Risco |
|---|---|---|---|---|---|---|
| User | Não | — | — | Não | Nenhum (global) | 🔴 Risco de vazamento (sem escopo de loja) |
| Product | Não | — | — | Não | Nenhum | 🔴 Risco de vazamento |
| Category (não existe entidade) | Não | — | — | Não | Nenhum | 🔴 Risco de vazamento |
| Customer | Não | — | — | Não | Nenhum | 🔴 Risco de vazamento |
| Order | Não | — | — | Não | Nenhum | 🔴 Risco de vazamento |
| OrderItem | Não | — | — | Não | Nenhum | 🔴 Risco de vazamento |
| Installment | Não | — | — | Nenhum | Nenhum | 🔴 Risco de vazamento |
| StoreSetting | Não | — | — | Não | Global (único) | 🟡 Precisa revisão |
| Auth/Users | Não | — | — | Não | Nenhum | 🔴 Risco de vazamento |

**Classificação geral:** 🔴 **Sem isolamento de tenant.**

### 2.3 Observações críticas

- `[Authorize]` **não garante isolamento multi-tenant**. Ele autentica o usuário, mas não restringe escopo por loja/tenant. Todas as queries retornam dados globais (sem cláusula `Where TenantId = ...`).
- Não existe endpoint que aceite/derive TenantId explicitamente. Também **não foi possível confirmar na auditoria** qualquer derivação por subdomínio, host, header `X-Tenant-Id` ou claim de tenant.
- Risco de **acesso cruzado entre lojas**: se existirem múltiplos tenants, qualquer usuário autenticado poderia acessar produtos/pedidos/clientes de outro tenant (pois não há filtro por escopo). Hoje, com modelo single-tenant aparente, isso não é explorado — mas para SaaS comercial multi-tenant é **crítico**.
- `AuthController.GetUsers()` retorna **todos os usuários** (sem filtro). `ToggleUserActive`, `CreateUser` operam globalmente.

**Conclusão (2):** O projeto **não possui multi-tenancy implementado**. O modelo atual é **single-tenant** (uma única loja por instância). Para transformar em SaaS multi-tenant (B2B/B2C com múltiplas lojas) será necessário introduzir `TenantId` em entidades relevantes, derivar/validar tenant por requisição, impor **filtro global por tenant** (multi-tenancy por banco/row-level) e validar ownership. Não foi possível confirmar na auditoria qualquer mecanismo de isolamento existente.


## 3. IDENTIDADE DO USUÁRIO

### 3.1 Estrutura existente

`User` possui: `Role` (string), `IsActive` (bool), `Email`, `Name`, `PasswordHash`, `CreatedAt`.

Roles encontradas no código: `Role = dto.Role ?? "Vendedor"` (AuthController.Register). Valores usados: `"Vendedor"`, `"Administrador"`/`Admin`? Frontend Settings usa `PerfilUsuario = "Administrador" | "Vendedor" | "Operador"`. Backend armazena string livre (`Role`).

### 3.2 Mapeamento Role → Permissões

| Role (backend string) | Onde usada | Operações permitidas (comprovadas) |
|---|---|---|
| `Vendedor` (padrão) | Register/CreateUser | Usuário comum (sem verificação explícita de role em muitos endpoints). |
| `Administrador` (frontend) / string Role | Settings (frontend mapeia role), AuthController possui endpoints "admin" (comentário `// LIST USERS (admin)`, `// TOGGLE USER ACTIVE`, `// CREATE USER (admin)`) | Endpoints: `GET /api/auth/users`, `PATCH /api/auth/users/{id}/toggle-active`, `POST /api/auth/users` — **todos `[Authorize]` apenas**. **Não foi possível confirmar na auditoria** verificação de `Role == "Admin/Administrador"` nesses endpoints. |
| `Operador` (frontend) | Definido no tipo Settings | **Não foi possível confirmar na auditoria** uso/validação no backend. |

### 3.3 Verificações de autorização (real)

- Autenticação: JWT + `[Authorize]` em quase todos controllers (exceto `ProductsController` GET público: `[AllowAnonymous]` em Get() e GetById()).
- Autorização por Role (RBAC): **não existe atributo `[Authorize(Roles="...")]`** nos controllers auditados. Os comentários indicam "admin", mas **não há checagem de role no código** desses endpoints (apenas `[Authorize]`).
- `AuthController.GetMe()` extrai `ClaimTypes.NameIdentifier`, busca user por Id.
- `StoreSettingsController`: `[Authorize]` (todos). Sem role check.
- Financeiro/Customers/Orders/Reports: `[Authorize]` geral.

**Risco:** Vendedor autenticado poderia, em teoria, acessar `GET /api/auth/users`, `PATCH /api/auth/users/{id}/toggle-active`, `POST /api/auth/users` — **não foi possível confirmar na auditoria** qualquer guard por role no backend. Apenas autenticação.

### 3.4 Hierarquia

**Não foi possível confirmar na auditoria** modelo Owner/Tenant hierarchy explícito. Não há `OwnerId`, `TenantId`, nem mapeamento User→Tenant. Roles são planos (string) sem herança/permissões granulares.

**Conclusão (3):** Identidade existe (JWT). RBAC é **parcial/implícito** (baseado em Role string) — **sem enforcement por atributo/guard no backend** nos endpoints "admin" (apenas `[Authorize]`). Ausência de isolamento por tenant. Modelo atual: usuários globais com role.

## 4. CORE DO MODALINK

### 4.1 Módulos existentes

| Módulo | Presente | Local |
|---|---|---|
| Products | Sim | Product + ProductsController |
| Categories | **Parcial** | Campo `Product.Category` (string opcional). **Não existe entidade `Category` nem `CategoriesController`** |
| Customers | Sim | Customer + CustomersController |
| Orders | Sim | Order/OrderItem + OrdersController |
| Sales/Vendas | Implícito | Criado via `OrdersController.Create` (Order com Status). Não há `SalesController` dedicado |
| Stock/Estoque | Implícito | `Product.Stock` + decremento em Create Order |
| Cash/Caixa | Não | **Não foi possível confirmar na auditoria** entidade/tabelas de Caixa/Abertura/Fechamento |
| Catalog/Catálogo | Implícito | Produtos expostos via `ProductsController.Get()` ([AllowAnonymous]) — consumo pelo frontend `/catalogo` |
| Users | Sim | User + AuthController |
| Tenants | Não | Ausente |

### 4.2 Genericidade vs. acoplamento a "moda"

| Aspecto | Análise (código existente) |
|---|---|
| Nomenclatura | `Title`, `Description`, `Price`, `Stock`, `Category`, `Customer`, `Order`, `OrderItem` — termos genéricos de varejo (não exclusivos de moda). |
| Modelos | `Product` genérico (sem campos de moda: tamanho, cor, grade, coleção, estação). `Customer` genérico (nome, contatos). `Order` genérico (pagamentos, parcelas). |
| Hardcoded específico de moda | **Não foi possível confirmar na auditoria** strings/validações hardcoded com termos exclusivos de moda (ex.: feminino/masculino, roupa/perfume específico). `Category` é campo livre (string). `StoreName`/branding livre. |
| Domínio | Core atual é **genérico de varejo básico** (estoque + catálogo + vendas + financeiro simplificado). |

**Observação:** "Moda" aparece em branding (ModaLink), não em regras de negócio. Domínios (moda/perfumes/brinquedos/calçados/cosméticos/casa) poderiam usar o mesmo modelo, com ressalvas em Variações (ver item 5).

**Conclusão (4):** O núcleo existente é **potencialmente reutilizável como Core genérico de varejo**. Está pouco acoplado a nicho de moda. Pontos limitantes: ausência de `Categories` (entidade), ausência de variações (SKU/tamanho/cor), ausência de multi-tenant e de camada de domínio desacoplada.

## 5. PRODUTO

### 5.1 O que EXISTE

| Campo | Modelo Product | DTO ProductCreateDto | Uso |
|---|---|---|---|
| Id | int | — | Sim |
| Title | string | Title | Sim |
| Description | string | Description | Sim |
| Price | decimal(18,2) | decimal Price | Sim |
| ImageUrl | string? | — (recebe IFormFile Image) | Upload via [FromForm] |
| Category | string? | string? Category | Texto livre |
| Stock | int | int Stock | Controle de estoque |
| CreatedAt | DateTime | — | Sim |
| UpdatedAt | DateTime | — | Sim |

### 5.2 O que NÃO EXISTE

| Campo necessário p/ varejo genérico | Existe? | Observação |
|---|---|---|
| SKU/Código de barras (SKU/EAN/GTIN) | Não | **Não foi possível confirmar na auditoria** |
| Custo (Cost/CostPrice) | Não | Só Price (venda) |
| Preço promocional/Desconto por produto | Não | Desconto só no Order (geral) |
| Status (Ativo/Inativo/Rascunho) | Não | Produto sempre "ativo" (sem flag) |
| Variações (Tamanho/Cor/Estilo) | Não | Ausente |
| Grade/Skus filhos (variants) | Não | Ausente |
| Marca (Brand) | Não | Ausente |
| Peso/Dimensões | Não | Ausente |
| Estoque mínimo/Alerta | Não | Ausente |
| Unidade de medida | Não | Ausente |
| Código interno | Não | Ausente |
| Tags | Não | Ausente |
| Imagens múltiplas | Não | Apenas 1 (ImageUrl) |
| Categoria (entidade) | Não | String livre |

### 5.3 Classificação (V1/Futuro)

| Item | Classificação | Justificativa (baseada no código) |
|---|---|---|
| Title, Description, Price, Stock, Image, Category(string) | **Necessário p/ V1** | Usados hoje (CRUD + Catálogo + PDV) |
| SKU/Código | **Necessário p/ V1** (genérico varejo) | Facilita busca, evita duplicados, integrações futuras. Ausente. |
| Status (Ativo/Inativo) | **Necessário p/ V1** | Catálogo pode ocultar produtos sem deletar. Ausente. |
| Custo | **Futuro** (não bloqueador V1) | Útil p/ margem/lucro (Reports). Não existe. |
| Variações (Tamanho/Cor) | **Futuro** (depende nicho) | Essencial p/ moda/calçados, opcional p/ perfumes/brinquedos. Ausente. |
| Marca, Peso, Múltiplas imagens | **Futuro** | Não crítico p/ V1 atual. |

**Conclusão (5):** Modelo `Product` é **mínimo e genérico**. Suporta V1 básico, mas insuficiente para varejo genérico com variações. Ausências relevantes: SKU, Status, entidade Category.

## 6. CATEGORIAS

### 6.1 Estado atual

- `Product.Category` é `string?` (campo livre).
- **Não existe entidade `Category`**.
- **Não existe `CategoriesController`**.
- Frontend: `CreateProduct` tem input de texto para categoria (sem select/dinâmico por loja).
- Sem relacionamentos (N:1) — modelagem por texto.

### 6.2 Dinamicidade por loja/tenant

| Questão | Resposta (auditoria) |
|---|---|
| Permite criar categorias sem alterar código? | **Parcial.** Pode digitar qualquer string no cadastro. Não há CRUD de categorias. Não há validação/normalização. |
| Loja A pode ter categorias diferentes de Loja B? | **Teoricamente sim (strings livres)**, mas **sem isolamento de tenant** (não há filtro/escopo). Dados globais. |
| Hierarquia (pai/filho)? | **Não foi possível confirmar na auditoria.** Ausente. |
| Categoria obrigatória/opcional? | Opcional (`string?`). |
| Reutilização/uniquidade? | Não há controle (pode duplicar strings). |

### 6.3 Modelo esperado (arquitetura SaaS)

Ideal: `Tenant` → `Category` (1:N) → `Product` (N:1) (entidade + CRUD + árvore). Hoje: `Product.Category` (denormalizado string).

**Conclusão (6):** Categorias **não são entidades dinâmicas**. São **metadados textuais livres**. Funciona p/ MVP, mas **não é modelagem robusta** para multi-loja/multi-nicho. Para escalar (mantendo Core genérico) recomenda-se evoluir para **entidade Category com escopo por tenant** (futuro). Não bloqueador imediato se single-tenant.

## 7. CATÁLOGO — ÁREA ESTRATÉGICA

### 7.1 Endpoints e acesso

- `GET /api/products` — `[AllowAnonymous]` → retorna **todos os produtos** (sem filtro por tenant/loja).
- `GET /api/products/{id}` — `[AllowAnonymous]` → produto por ID.
- Consumo frontend: `Catalogo.tsx` chama `getProducts()` (services/productService.ts) e renderiza grid.

### 7.2 Identificação de loja

**Não foi possível confirmar na auditoria** identificação de loja para catálogo público.

- Sem slug (`/catalogo/:slug`, `/loja/:slug`)
- Sem domínio personalizado (subdomínio)
- Sem `StoreId/TenantId`
- Sem parâmetro de loja na rota pública
- Catálogo consome `/products` (global). Depende de `StoreSettings` (único) para branding (nome/logo) — usado no admin/POS, **não foi possível confirmar na auditoria** se catálogo público consome `StoreSettings` (páginas catálogo/admin distintas).

### 7.3 Funcionalidades existentes

| Item | Existe? | Evidência |
|---|---|---|
| Catálogo público | Sim | `[AllowAnonymous]` em Products GET |
| Identifica loja (slug/subdomínio) | Não | **Não foi possível confirmar na auditoria** |
| Tenant no catálogo | Não | Sem TenantId |
| Produtos por tenant correto | Não (atual) | Retorna todos (global). Sem filtro. |
| Categorias dinâmicas no catálogo | Parcial | Filtra por string? Frontend catálogo não filtra por categoria visível (só busca por título). |
| Estoque respeitado | Parcial | Não há filtro `Stock > 0` no GET público. Produtos com estoque 0 aparecem no catálogo. (PDV valida estoque no pedido; catálogo não oculta por estoque) |
| Preço respeitado | Sim | Retorna Price do produto. |
| Carrinho | Parcial | Frontend catálogo tem estado `cart` local (só mostra item selecionado, sem API/cart). **Não existe endpoint de Carrinho** |
| Pedido | Sim | `POST /api/orders` (autenticado) — fluxo PDV/admin |
| Integração WhatsApp | Não | **Não foi possível confirmar na auditoria** |
| Compartilhamento | Não | Ausente |
| Busca | Sim | Frontend Catalogo: filtra por `title.toLowerCase()` (cliente-side). API não tem `search` em Products público |
| Filtros | Não | Apenas busca por título (frontend). Sem categoria/marca/preço |
| Paginação | Não | `ProductsController.Get()` retorna `ToListAsync()` completo (sem Skip/Take) |
| Mobile-first | Sim | Tailwind + grid responsivo (2/md:3/lg:4) |

### 7.4 Observação crítica (isolamento)

Catálogo público é **global** (sem tenant). Para SaaS multi-tenant com catálogos por loja, isso é **incompatível** sem escopo por tenant/slug.

**Conclusão (7):** Catálogo existe e é funcional (público). Falta **identificação da loja (slug/domínio)**, **paginação**, **filtro por estoque ativo (Stock>0)**, **filtros por categoria**, **carrinho persistido** e **escopo por tenant** (caso multi-tenant).


## 8. STORE SETTINGS / BRANDING

### 8.1 O que existe

`StoreSetting` (modelo): `Id, StoreName, Phone?, Address?, LogoUrl?, UpdatedAt`  
Controller: `StoreSettingsController` `[Authorize]` — GET (cria default se null), PUT (upsert).  
Migration: AddUserRoleAndStoreSettings (cria tabela).

### 8.2 Consumo

**Não foi possível confirmar na auditoria** consumo direto do catálogo público por `StoreSettings`. Frontend admin usa Settings (página). TopBar/SideBar exibem "ModaLink" (branding hardcoded em alguns trechos). Backend não expõe endpoint público para StoreSettings (requer `[Authorize]`).

### 8.3 Gap vs. necessidades futuras

| Campo futuro | Existe? | Uso atual |
|---|---|---|
| StoreName | Sim | Sim |
| LogoUrl | Sim | Sim |
| PrimaryColor/SecondaryColor/AccentColor | Não | **Não foi possível confirmar na auditoria** |
| BannerUrl | Não | Não |
| InstagramUrl | Não | Não (Customer tem Instagram, Store não) |
| WhatsAppNumber | Não (tem Phone) | Phone existe |
| CatalogSlug | Não | Não |
| CatalogEnabled | Não | Não |
| Favicon/SEO | Não | Não |

### 8.4 Duplicação/uso

- Admin/POS consomem via `[Authorize]` (Settings).  
- Catálogo público: **não acessa StoreSettings publicamente** (endpoint protegido). Branding visual no catálogo usa UI padrão.

**Conclusão (8):** `StoreSettings` cobre **identidade básica** (nome/contato/logo). É suficiente p/ V1 single-tenant, mas **incompleto** p/ catálogo público multi-loja (falta slug, cores, flags, campos de mídia/links). Também **não há exposição pública** de settings para personalização do catálogo sem autenticação.

## 9. FLUXO COMERCIAL COMPLETO

| Etapa | Existe | Funciona (lógica) | Problema identificado | Prioridade |
|---|---|---|---|---|
| PRODUTO (cadastro) | Sim | ProductsController.Create ([FromForm]) | Upload duplicado (Create/Update), sem validação tipo/tamanho (mapeado auditoria anterior). Sem SKU/Status. | Média |
| ESTOQUE (produto.Stock) | Sim | Campo + decremento | Sem histórico/movimentações, sem bloqueio concorrência otimista, permite negativo? (decrementa após save; se concorrência, não valida versão). Catálogo não oculta Stock<=0. | Alta |
| CATEGORIAS | Parcial | String livre | Sem entidade/CRUD, sem escopo. | Baixa/Média |
| CATÁLOGO (público) | Sim | GET /products AllowAnonymous | Sem tenant/slug, sem paginação, sem filtro Stock>0, sem filtros. | Alta |
| CLIENTE | Sim | Customer (find-or-create por nome no pedido) | Find-or-create por nome (pode criar duplicados), Email/Phone opcionais, sem unicidade forte. Cliente pertence a tenant? Ausente. | Média |
| CARRINHO | Parcial | Estado local (frontend) | **Não existe API/entidade Carrinho**. Sem persistência, sem guest token, sem recuperação entre dispositivos. | Média |
| PEDIDO | Sim | OrdersController.Create (autenticado) | Regra no controller, transação implícita (SaveChanges múltiplos), cálculo juros/parcelas misto (backend+frontend), valida estoque antes, decrementa após. Distingue Crediário/Pending vs Completed. | Alta |
| VENDA | Implícito | Order.Status (Completed/Pending) | **Não diferencia Pedido vs Venda** explicitamente (ver seção 10). Venda = conversão do pedido. | Alta |
| PAGAMENTO | Implícito | Installments (crediário) + PaymentMethod | Sem entidade Pagamento/Transações, baixa por parcela (Finances), sem recibo, sem estornos detalhados. | Média |
| CAIXA | Não | **Não foi possível confirmar na auditoria** | Sem abertura/fechamento/movimentações. Financeiro é contas a receber (crediário), não PDV/Caixa completo. | Média/Alta |
| BAIXA DE ESTOQUE | Sim | Decremento em Create Order (loop por itens) | 2 SaveChanges (valida + adiciona order + depois decrementa). Sem devolução automática em cancelamento (não há endpoint cancelamento com estorno de estoque). Sem movimentação de estoque auditável. | Alta |

**Conclusão (9):** Fluxo core existe (Produto→Estoque→Catálogo→Cliente→Pedido→Venda→Baixa). Quebras: **Carrinho não persistido (API)**, **Caixa ausente**, **histórico/movimentação de estoque ausente**, **estorno de estoque em cancelamento não evidente**, **concorrência/atomicidade** (múltiplos SaveChanges).

## 10. PEDIDO VS VENDA

### 10.1 Estado atual (código)

- `Order.Status`: `"Pending"` ou `"Completed"` (definido por `PaymentMethod == "Crediário" ? "Pending" : "Completed"`).
- `PaymentMethod`: string (Pix/Dinheiro/Cartão/Crediário — valores usados no frontend).
- `Installments`: gerados apenas para `"Crediário"`. Para outros métodos, sem parcelas, Status `Completed`.
- `FinancesController`: opera sobre `Installments` (contas a receber) — foca em parcelas pendentes.

### 10.2 Distinção conceitual

| Conceito | Existente? | Interpretação no código |
|---|---|---|
| Pedido (Order Intent) | Sim | `Order` representa **pedido/venda registrada**. Não há entidade `Sale` separada. |
| Venda (Sale/Receipt) | Implícito | Considera-se venda efetivada quando `Status == "Completed"` (à vista) ou parcialmente (crediário gera recebíveis). Não há entidade `Sale` dedicada. |
| Pagamento | Parcial | Pago via baixa de parcelas (`PayInstallment`) ou considerado concluído (à vista). Sem tabela `Payments` (transações). |

### 10.3 Arquitetura futura (catálogo online + PDV)

Necessidade: suportar

1. **Catálogo → Pedido Online** (intent) → **Aprovação → Venda → Pagamento**
2. **PDV (balcão)** → **Venda → Pagamento** (direto)

Hoje tudo conflui em `Order` + lógica condicional (`Crediário` vs outros). **Não há separação de domínios Pedido/Venda/Pagamento**.

**Conclusão (10):** Sistema **não diferencia explicitamente** Pedido/Venda/Pagamento (modelo unificado `Order` + `Installments`). É viável p/ V1 (PDV + balcão), mas gera acoplamento para evoluir para **pedido online com carrinho + aprovação + múltiplos pagamentos**. Não é reconstrução obrigatória, mas **precisa de clareza de modelo** (pode evoluir por especialização sem duplicar regras).

## 11. ESTOQUE

### 11.1 Estrutura

- `Product.Stock` (int). Único campo de estoque.
- Validação: `OrdersController.Create` verifica `product.Stock < item.Quantity` → `BadRequest` (antes de salvar).
- Baixa: após criar `Order`, loop atualiza `product.Stock -= item.Quantity` + `UpdatedAt` (segundo `SaveChangesAsync`).
- Movimentação: **Não foi possível confirmar na auditoria** entidade `StockMovement/InventoryMovement/Adjustment`.

### 11.2 Análises

| Item | Estado | Observação |
|---|---|---|
| Estoque por produto | Sim | Único |
| Movimentação (entrada/saída/ajuste) | Não | Ausente (sem histórico auditável) |
| Entrada (compra/ajuste +) | Não | Só decremento por venda |
| Saída | Sim (venda) | Via decremento |
| Ajuste de estoque | Não | Sem endpoint |
| Devolução/cancelamento devolve estoque | **Não evidente** | Não há endpoint `CancelOrder`/`Delete Order` com estorno. `OrdersController` tem apenas GetAll/GetById/Create. |
| Estoque negativo | Não prevenido de forma robusta | Validação por leitura (FindAsync) antes de salvar; em alta concorrência pode ocorrer race condition (não há versão/row lock otimista). |
| Concorrência | Fraca | Dois requests simultâneos podem ler Stock 5, ambos vender 5 → inconsistência teórica. Sem `ConcurrencyToken`. |
| Reserva (cart/pedido pendente) | Não | Não reserva estoque em carrinho/pedido pendente. Só baixa na criação do Order. |

**Conclusão (11):** Estoque é **básico (campo único)**. Funcional p/ V1 com baixo volume, **insuficiente** para auditoria/concorrência/multi-canal (falta movimentações, estornos, reserva, controle de versões).

## 12. CAIXA / FINANCEIRO

### 12.1 Separação existente

- `FinancesController`: foca em **contas a receber** (crediário) — `Installments`, `PayInstallment`, `UnpayInstallment`, totais a receber/pagos/vencidos.
- `OrdersController`: PDV/vendas (criação de pedidos).
- `ReportsController`: vendas/resumo.

### 12.2 Caixa (PDV)

**Não foi possível confirmar na auditoria** entidades: `CashRegister`, `CashOpening`, `CashClosing`, `CashMovement`, `Payments`.

Formas de pagamento: `PaymentMethod` string (usado). Não há registro de pagamentos por transação (pagamento à vista não gera `Installment`, só altera `Status=Completed`).

### 12.3 Classificação V1 vs Avançado

| Módulo | Core V1 | Financeiro Avançado | Estado atual |
|---|---|---|---|
| Vendas (à vista/prazo) | Necessário | — | **Parcial** (OK p/ V1) |
| Contas a receber (crediário) | Necessário | — | **Presente** (Installments + Finances) |
| Contas a pagar | — | Avançado | Ausente |
| Caixa (abertura/fechamento) | Recomendado p/ PDV físico | — | **Ausente** |
| Movimentações caixa (entradas/saídas avulsas) | Opcional V1 | Avançado | Ausente |
| Pagamentos (tabela Payments) | Futuro | Avançado | Ausente |
| Conciliação/fluxo de caixa | — | Avançado | Ausente |

**Conclusão (12):** Financeiro atual é **focado em recebíveis (crediário)**. Falta **Caixa (PDV físico)**: abertura/fechamento, sangrias/suprimentos, conciliação por forma de pagamento. Recomendação: **não inflar ERP**. Manter **Core V1 = Vendas + Recebíveis + Estoque + Catálogo**. Caixa pode ser **P1** (se PDV físico crítico) ou **P2**.

## 13. CLIENTES

### 13.1 Modelo

`Customer`: Id, Name, Email?, Phone?, WhatsApp?, Instagram?, BirthDate?, Notes?, Active, CreditLimit?, CreatedAt. Relaciona com Orders (Include).

### 13.2 Análises

| Item | Estado | Observação |
|---|---|---|
| Pertence a tenant | Não | Sem TenantId |
| Histórico completo | Sim | GetById inclui Orders→Items→Product + Installments |
| WhatsApp disponível | Sim | Campo WhatsApp |
| Duplicação | Possível | `OrdersController.Create` faz `FirstOrDefaultAsync(c => c.Name == dto.CustomerName)` (busca só por Nome). Sem unicidade (Email/Phone). Pode criar duplicados com variações de nome. |
| Estrutura p/ CRM futuro | Parcial | Campos básicos OK. Falta origem, tags, status de relacionamento, último contato. |
| Crédito/limite | Sim | `CreditLimit` (decimal?) presente, usado em visão (Customers lista), mas **não validado** no Create Order (crediário não checa limite disponível). |

**Conclusão (13):** Clientes OK p/ V1. Melhorias: unicidade (Email/Phone/WhatsApp), validação de crédito-limite vs saldo devedor, escopo por tenant.

## 14. SELLER / VENDEDOR

### 14.1 Estado atual

- `Order` **não possui `SellerId/VendedorId`**.
- `User.Role = "Vendedor"` existe (identidade do usuário do sistema).
- Não há associação explícita entre Pedido/Venda e Vendedor que realizou a venda.

### 14.2 Possibilidade futura

Fluxos propostos (futuro): vendedor físico/online/IA. Arquitetura atual **permite adicionar `Order.SellerId` (FK User)** sem reconstruir core (adição não-breaking em modelo + mapeamento). Também permitiria associar Catálogo/Pedidos por vendedor.

**Gap:** Hoje não rastreia comissionamento, metas por vendedor, ou atribuição de pedido.

**Conclusão (14):** Estrutura **permite evolução** (campo FK opcional). **Não existe** hoje. Não bloqueia V1. Pode ser adicionado futuramente com baixo impacto arquitetural (desde que com multi-tenancy/escopo corretos).

## 15. IA — SOMENTE ARQUITETURA FUTURA

### 15.1 Estado atual

`ia-vendas/IAVendas.tsx` existe (frontend) — conforme auditoria/chatlog: **respostas mockadas** (sem backend). Nenhum controller/serviço de IA no backend.

### 15.2 Viabilidade arquitetural

Agente "Vendedor Online" futuro: Cliente → Catálogo → Agente → Produtos/Estoque/Pedidos → WhatsApp → Vendedor humano.

**Análise de acoplamento (permitiria adicionar sem reconstruir?):**

- Core (Products/Stock/Orders/Customers/Catalog) é **genérico** (sem acoplamento a IA).
- APIs existentes são REST (read/write produtos/pedidos). Podem ser consumidas por agente (service-to-service).
- Ausência de camada de domínio separada dificulta orquestração complexa, mas **não impede** adicionar camada de Agentes/Orquestração (API externa ou módulo interno) consumindo APIs existentes (ouvia eventos futuros).
- Pontos que facilitariam: separar regras de negócio (hoje em controllers) em Services/UseCases, expor DTOs estáveis, ter Carrinho/Pedido bem definidos, multi-tenancy/escopo.

**Conclusão (15):** Arquitetura atual **permite adicionar IA/Agente futuramente sem reconstruir o sistema inteiro**, desde que seja feita por **composição (agente consome APIs existentes)**. Para orquestração mais profunda (decisões complexas), seria vantajoso refatorar regras para camada de aplicação (Services/UseCases) — mas **não é pré-requisito obrigatório**. Recomendação: **não implementar IA agora** (conforme solicitado). Arquitetura não é bloqueante.

## 16. FRONTEND

### 16.1 Estrutura e separação

| Critério | Análise |
|---|---|
| Separação Admin vs Público | **Parcial.** Rotas protegidas (ProtectedLayout) = área administrativa (Dashboard, Produtos, Pedidos, Clientes, Financeiro, IA, Configurações, Relatórios, PDV, Catálogo interno). Catálogo é rota protegida também (`/catalogo`). Não existe rota pública `/loja/:slug` separada (catálogo público backend via AllowAnonymous, mas frontend atual exige auth?). `Catalogo.tsx` consome `/products` (público no backend) — usado dentro da área logada. **Não foi possível confirmar na auditoria** área pública totalmente desacoplada (sem auth). |
| Componentes reutilizáveis | Básicos (SideBar/TopBar/MainLayout/PrivateRoute). Ausência de design system evidente (estilos variados entre páginas). |
| Layouts | MainLayout + ProtectedLayout OK. |
| Contexts/State | AuthContext (token+user em localStorage) OK. Estado local predominante. |
| Services | Centralizados (api.ts com interceptor request Authorization). **Falta interceptor response 401** (logout automático) — já mapeado auditoria anterior. |
| Rotas | React Router v7, bem organizadas. |
| Tratamento de erro | Básico (try/catch + setError). |
| Responsividade | Tailwind, mobile-first (sidebar hamburger). |
| Tipagem | TypeScript presente (tipos parciais: Order.types.ts, etc.) |

**Conclusão (16):** Frontend bem estruturado p/ SPA administrativa. Falta **separação clara entre Catálogo Público (sem auth, com slug)** e Área Administrativa. Componentização pode evoluir, mas **preservável**.

## 17. API

### 17.1 Mapa por domínio

| Domínio | Controller | Endpoints (principais) | Ausentes (evidentes) |
|---|---|---|---|
| Auth | AuthController | POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/change-password, GET /auth/users, PATCH /auth/users/{id}/toggle-active, POST /auth/users | Refresh token, Logout (stateless JWT), RBAC enforcement, Reset password |
| Users | (Auth) | Mesmo acima | Users CRUD separado, Tenant scope |
| Products | ProductsController | GET /products (AllowAnonymous), POST /products ([Authorize]), GET /products/{id} (AllowAnonymous), PUT /products/{id}, DELETE /products/{id} | GET com search/pagination/filter/category/stock>0, Status, SKU, Variants, Upload validation robusta |
| Categories | — | **Nenhum** | CRUD Categories, Hierarquia |
| Customers | CustomersController | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} (todos [Authorize]) | Search avançado, Unicidade, Balance detalhado por filtros |
| Orders | OrdersController | GET, GET/stats, GET/{id}, POST (todos [Authorize]) | PUT/Status (update), Cancel/Refund (com estorno estoque), Delete com regras |
| Sales | — | Implícito (Orders) | /sales dedicado |
| Stock | — | Implícito (Product.Stock) | Movimentações, Ajustes, Histórico, Reserva |
| Cash/Caixa | — | **Nenhum** | Abertura/Fechamento/Movimentações |
| Catalog | (Products público) | Via /products | /catalog/public/{slug}, /catalog/{tenantSlug}/products, filtros/pagination públicos |
| Settings | StoreSettingsController | GET, PUT ([Authorize]) | GET público (/store/public), Branding completo |

### 17.2 Observações arquiteturais

- Endpoints REST simples.  
- Mistura responsabilidades (Auth abriga gestão de users).  
- Sem versionamento (`/api/v1/...`).  
- Sem HATEOAS/pagination padrão.  
- Validação: mínima (sem DataAnnotations consistentes nos DTOs — já apontado).  
- Sem rate limiting/global exception handling padronizado evidente.

**Conclusão (17):** API funcional, coesa p/ MVP. Domínios faltantes: **Categories, Stock (movimentações), Cash, Catalog (público com escopo)**.

## 18. BANCO DE DADOS

### 18.1 Estrutura

| Item | Análise |
|---|---|
| Tabelas | Customers, Products, Orders, OrderItems, Users, Installments, StoreSettings (7) |
| PKs | Identity (int) em todas |
| FKs | Order→Customer (SetNull), OrderItem→Order (Cascade), OrderItem→Product (Cascade), Installment→Order (Cascade) |
| Índices | Apenas `IX_StoreSettings_Id` (migration). Sem índices em FKs/colunas de busca (Customer.Name/Email, Product.Title/Category, Order.CreatedAt, Installment.DueDate/IsPaid) |
| Constraints | Básicas (not null conforme modelos). Sem UNIQUE (Email User? não há unique index; Customer.Name sem unique). |
| Relacionamentos | Corretos (1:N, nullable Customer). |
| Nullable | Adequados (ImageUrl, Category, Customer campos opcionais). |
| Enums | Strings (Role, PaymentMethod, Status) — sem enum tipo DB/C#. Flexível, menos tipado. |
| Decimal/Money | `numeric(18,2)` correto. |
| Timestamps | `timestamp with time zone` (DateTime.UtcNow). |
| Cascade Delete | OrderItem→Order Cascade, Installment→Order Cascade, Order→Customer SetNull, OrderItem→Product Cascade (remove itens ao deletar produto — **risco de perda histórica de pedidos**). |

### 18.2 Riscos (integridade)

- `OrderItem.ProductId` FK com `OnDelete(DeleteBehavior.Cascade)`: deletar produto apaga itens de pedidos históricos → **perda de integridade histórica** (preços/unitários históricos existem mas vínculo de produto some). Melhor seria `Restrict/NoAction` (impedir deletar produto com pedidos) ou soft delete (`IsActive/DeletedAt`).
- Sem UNIQUE em `Users.Email` (apenas checado via `AnyAsync` no código) — risco de race condition.
- Sem índices de performance (buscas/listagens crescerão).
- **Sem TenantId → sem integridade/isolamento multi-tenant**.
- Ausência de `ConcurrencyToken` (RowVersion) em entidades com estoque/atualizações críticas.

### 18.3 Multi-tenant (DB)

**Integridade suficiente p/ SaaS multi-tenant?** **Não.** Falta coluna `TenantId` em todas entidades com dados de negócio (Users? Users por tenant, Products, Customers, Orders, OrderItems, Installments). Também precisaria de FKs Tenant, índices compostos `(TenantId, Id)` e **obrigatoriedade de filtrar por TenantId em todas queries**.

**Conclusão (18):** Schema limpo, relacionamentos coerentes p/ single-tenant. **Ponto crítico**: `OrderItem→Product` Cascade Delete (histórico). Índices ausentes. Para multi-tenant: **incompleto (sem TenantId + índices compostos + constraints por tenant)**.


## 19. O QUE DEVEMOS PRESERVAR

🟢 **PRESERVAR**

- **Stack sólida** (.NET 8 + EF Core + React + Vite + PostgreSQL) — coerente e moderna.
- **Modelo de domínio varejo básico** (Products, Customers, Orders, OrderItems, Installments) — genérico, reutilizável.
- **Lógica de Crediário/Parcelas** existente (cálculo com juros simples, geração/ajuste última parcela, baixa/reabertura) — valor de negócio real.
- **PDV (NovaVenda)** + fluxo de criação de pedido com validação de estoque — funciona bem.
- **Catálogo público** com `[AllowAnonymous]` — base estratégica correta.
- **Autenticação JWT + BCrypt** — segura e adequada.
- **Docker Compose + Migrations automáticas** — pragmático p/ deploy.
- **Frontend organizado** (rotas, layouts, services, auth context) — bom ponto de partida.
- **StoreSettings** (identidade básica) — estrutura simples e útil.
- **Decisão find-or-create de cliente no PDV** — agilidade operacional (com ressalvas de duplicados).
- **Separação Financeiro (Recebíveis)** vs Vendas — bom corte.
- **Nomenclatura genérica** (sem acoplamento excessivo a moda) — facilita expansão a outros nichos.

## 20. O QUE DEVEMOS CORRIGIR

🟡 **CORRIGIR** (sem reconstruir, evoluir)

- **Multi-tenancy (crítico p/ SaaS)**: adicionar `TenantId` em entidades de negócio (User, Product, Customer, Order, OrderItem, Installment) + derivação/validação + **filtro obrigatório por tenant** em todas queries (row-level). Não implementado.
- **RBAC enforcement**: aplicar `[Authorize(Roles="...")]` (ou policy) nos endpoints "admin" (GET/PACTH/POST users, gestão). Hoje só `[Authorize]`.
- **Histórico de pedidos**: alterar `OrderItem→Product` DeleteBehavior de `Cascade` para `Restrict/NoAction` (ou soft delete Product). Evitar perda histórica.
- **Upload (Products)**: extrair lógica duplicada (Create/Update) para método privado, adicionar validação de tipo MIME/extensão + tamanho máx. (já mapeado, reforço arquitetural).
- **Estoque**: evitar múltiplos `SaveChangesAsync` no Create Order (transação única/atômica). Considerar reserva vs baixa.
- **Carrinho**: definir modelo (API persistido) vs local-only. Hoje local-only limita carrinho público/compartilhado.
- **Uniquidade/duplicados**: fortalecer unicidade (User.Email, Customer por Email/Phone) + tratamento race conditions.
- **Índices DB**: adicionar índices em FKs + `(CreatedAt)`, `(DueDate,IsPaid)`, `(CustomerId)`, `(ProductId)`, `(OrderId)`.
- **Catálogo público**: expor StoreSettings público (sem auth) p/ branding, adicionar filtro `Stock > 0` (opcional por configuração), paginação.
- **DTOs/Validação**: padronizar validação (DataAnnotations/FluentValidation) + separar DTOs de Commands.
- **Interceptor 401** (frontend): logout automático em token expirado/invalidado.

## 21. O QUE PRECISA SER RECONSTRUIR

🔴 **RECONSTRUIR**

**Não foi possível confirmar na auditoria evidência real para reconstrução completa de nenhum módulo.**

| Item | Avaliação | Explicação |
|---|---|---|
| Camada de Domínio (Core isolado) | **Não reconstruir — evoluir** | Controllers+EF funcionam. Melhor refatorar para Application Services/UseCases (evolução incremental), não rewrite. |
| Models/Schema | **Não reconstruir** | Schema coerente p/ single-tenant. Evoluir com migrações (adicionar TenantId, índices). |
| Frontend | **Não reconstruir** | Estrutura preservável. Evoluir separação público/admin. |
| API | **Não reconstruir** | Domínios claros, podem crescer organicamente. |

**Conclusão (21):** **Nenhum bloco precisa ser reconstruído do zero.** Projeto é **evolucionável** (refatoração incremental). Maior gap: **Multi-tenancy (modelo de dados + filtros)** — exige adição de campos + disciplina de queries (não rewrite).

## 22. O QUE NÃO DEVEMOS FAZER AGORA

**Baseado no estado atual + visão SaaS genérico:**

- **IA/Vendedor Online** — fora de V1. Mock já existe, backend não necessário.
- **CRM avançado** (funil, leads, campanhas, automações) — futuro.
- **Marketplace (multi-vendedores)** — exige Seller completo + comissões + split pagamentos + multi-tenancy maduro.
- **BI/Analytics avançado** (dashboards complexos, cubes) — Reports atual suficiente p/ V1.
- **Integrações complexas** (ML/ERP/Marketplaces externos, gateways de pagamento com split) — adiar.
- **Automações complexas (workflows)** — adiar.
- **Categories hierárquicas complexas + árvore profunda** — começar simples (entidade Category flat + escopo).
- **Múltiplas imagens + variantes completas (PIM avançado)** — futuro (depende nicho).
- **Caixa completo (conciliiação avançada)** — pode ser P2 (se não crítico p/ lançamento).
- **Soft delete em tudo** — aplicar seletivamente (Products/Orders críticos). Não generalizar agora.

## 23. DEFINIÇÃO DE MODALINK V1

| Módulo | Status | Observação (baseada em auditoria) |
|---|---|---|
| **1. Multi-tenancy** | 🔴 Precisa construir | Ausente. Essencial p/ SaaS comercial com múltiplas lojas. |
| **2. Authentication** | 🟢 Pronto | JWT + BCrypt OK. Falta RBAC enforcement + refresh token. |
| **3. Users/Roles** | 🟡 Parcial | Modelo existe, RBAC não aplicado (apenas auth). Roles string livres. |
| **4. Products** | 🟡 Parcial | CRUD OK. Falta SKU, Status(Ativo/Inativo), entidade Categories. |
| **5. Categories** | 🔴 Precisa construir | Só string livre. Necessário entidade + CRUD + escopo por tenant. |
| **6. Stock** | 🟡 Parcial | Campo existe + baixa OK. Falta movimentações, reserva, estorno automático, concorrência. |
| **7. Customers** | 🟡 Parcial | CRUD + histórico OK. Falta unicidade, validação crédito-limite. |
| **8. POS (PDV)** | 🟢 Pronto | NovaVenda + validação estoque OK p/ V1. |
| **9. Cash (Caixa)** | 🔴 Precisa construir | Ausente (abertura/fechamento/movimentações). Depende escopo PDV físico. |
| **10. Orders** | 🟡 Parcial | Core OK. Falta distinção Pedido/Venda clara, cancelamento+estorno, atomicidade transacional. |
| **11. Catalog** | 🟡 Parcial | Público OK. Falta slug/tenant, paginação, filtros, Stock>0, StoreSettings público. |
| **12. Store Settings** | 🟡 Parcial | Básico OK. Falta branding completo + exposição pública + slug/catalog flags. |

**Legenda:** 🟢 Pronto | 🟡 Parcial | 🔴 Precisa construir

## 24. ROADMAP TÉCNICO (P0/P1/P2/P3)

### P0 — BLOQUEADORES (risco/viabilidade SaaS)

| # | Item | Impacto | Risco | Esforço (estimado) |
|---|---|---|---|---|
| P0-1 | **Multi-tenancy base**: adicionar `TenantId` (User, Product, Customer, Order, OrderItem, Installment), derivação/validação por request, impor filtro global por tenant em queries. | Alto (Produto/SaaS) | Alto | Médio/Alto |
| P0-2 | **RBAC enforcement**: `[Authorize(Roles="...")]`/policies em endpoints admin (users management). | Alto (Segurança) | Alto | Baixo |
| P0-3 | **Corrigir histórico**: `OrderItem→Product` DeleteBehavior → `Restrict/NoAction` (ou soft delete). | Alto (Integridade) | Alto | Baixo |
| P0-4 | **Transação atômica Order+Stock**: unificar SaveChanges (Create Order) + validação concorrência básica. | Alto (Consistência) | Alto | Baixo/Médio |
| P0-5 | **Índices críticos DB** (FKs, CreatedAt, DueDate+IsPaid, buscas). | Alto (Performance/Integridade) | Médio-Alto | Baixo |

### P1 — V1 (essenciais p/ lançamento)

| # | Item | Impacto | Risco | Esforço |
|---|---|---|---|---|
| P1-1 | **Categories (entidade)**: CRUD Categories + FK Product→Category (N:1) + escopo por Tenant. Migrar Category string→entidade. | Alto (Genérico) | Baixo | Médio |
| P1-2 | **Products essenciais**: adicionar `SKU` (único por tenant), `IsActive` (Status). | Alto (Varejo genérico) | Baixo | Baixo/Médio |
| P1-3 | **Catálogo com escopo**: slug de loja (`/catalogo/:slug` ou domínio) + filtrar produtos por tenant + `Stock > 0` (configurável) + paginação + filtros (categoria). Expor StoreSettings público. | Alto (Estratégico) | Médio | Médio/Alto |
| P1-4 | **Estoque robusto**: movimentações (StockMovement) + estorno automático em cancelamento de pedido + impedir negativo com locks/otimista. | Alto (Operacional) | Médio | Médio |
| P1-5 | **Caixa (básico)**: CashRegister + Abertura/Fechamento + Movimentações (entradas/saídas). Mínimo p/ PDV físico. | Alto (PDV) | Médio | Médio |
| P1-6 | **Carrinho API**: entidade Carrinho + itens (guest/auth) p/ fluxo catálogo→pedido online. | Alto (Catálogo→Venda) | Médio | Médio |

### P2 — MELHORIAS (pós-V1)

| # | Item | Impacto | Risco | Esforço |
|---|---|---|---|---|
| P2-1 | **Separação Pedido/Venda/Pagamento**: evoluir modelo (Payments, Sale opcional) sem quebrar Order existente. | Alto (Arquitetura) | Baixo | Médio/Alto |
| P2-2 | **Clientes**: unicidade (Email/Phone), validação CreditLimit vs saldo devedor, soft delete. | Médio/Alto | Baixo | Baixo |
| P2-3 | **Vendedor (SellerId)**: adicionar `Order.SellerId` FK User + relatórios por vendedor. | Médio | Baixo | Baixo |
| P2-4 | **Upload/Imagens**: validação MIME/tamanho, múltiplas imagens, otimização. | Médio | Baixo | Baixo/Médio |
| P2-5 | **Paginação/pesquisa padronizada** (API). | Médio | Baixo | Baixo |
| P2-6 | **Soft delete + histórico auditável** (Products, Customers). | Médio | Baixo | Médio |

### P3 — FUTURO (estratégico)

| # | Item | Impacto | Risco | Esforço |
|---|---|---|---|---|
| P3-1 | **IA/Vendedor Online** (agente consumindo APIs). | Alto (Estratégico) | Baixo | Alto |
| P3-2 | **CRM + Comissões + Multi-vendedores (Marketplace)** | Alto | Alto | Alto |
| P3-3 | **BI avançado, Integrações (WhatsApp, pagamentos, marketplaces)** | Alto | Médio/Alto | Alto |

**Ordenação:** por **Impacto no produto + Risco técnico** (não facilidade). P0 = bloqueadores p/ SaaS multi-tenant/comercial.

## 25. FLUXO FINAL DE VALIDAÇÃO

Fluxo esperado (LOJA → CATÁLOGO → CLIENTE → PEDIDO → VENDA → CAIXA → ESTOQUE):

| Etapa | Suportado hoje? | Onde quebra / Observação |
|---|---|---|
| **LOJA cadastra PRODUTO** | **Sim** | `ProductsController.Create` ([FromForm]) + auth. Falta SKU/Status/Categoria entidade. |
| **PRODUTO aparece no CATÁLOGO** | **Sim** | `GET /products` AllowAnonymous. **Quebra:** sem escopo por loja/tenant, sem slug, aparece Stock<=0. |
| **CLIENTE acessa LINK** | **Parcial** | Sem link por loja (`/catalogo` genérico). Precisa `/catalogo/:slug` (ou subdomínio). |
| **CLIENTE escolhe PRODUTO** | **Sim** | Catálogo renderiza produtos. |
| **CARRINHO** | **Parcial** | Estado local apenas (sem API/persistência/compartilhamento). |
| **PEDIDO** | **Sim** | `POST /api/orders` ([Authorize]). Fluxo PDV atual exige auth (admin). Pedido online público exigiria carrinho+checkout público ou auth opcional. |
| **LOJA RECEBE PEDIDO** | **Sim** | Orders listagem (admin). |
| **VENDA** | **Sim (implícito)** | Status Completed/Pending (à vista/crediário). Sem entidade Sale explícita. |
| **PAGAMENTO** | **Parcial** | À vista: Status Completed. Crediário: parcelas (Installments + Finances). Falta tabela Payments + fluxo público. |
| **CAIXA** | **Não** | **Não suportado.** Sem abertura/fechamento/movimentações/conciliação. |
| **ESTOQUE ATUALIZADO** | **Sim** | Decremento após criar Order. **Quebra:** sem estorno em cancelamento, sem movimentação auditável, sem reserva em carrinho. |

**Veredito (Fluxo Final):** Suporta **fluxo PDV/balcão** (admin logado). Suporta **catálogo leitura pública**. **Não suporta completamente fluxo e-commerce público (catálogo→carrinho→pedido→pagamento sem auth + multi-loja + caixa)**. Principais quebras: **identificação de loja (slug/tenant)**, **carrinho API**, **Caixa**, **cancelamento+estorno estoque**.

## 26. RELATÓRIO FINAL

### 1. RESUMO EXECUTIVO

ModaLink possui **base sólida e funcional** (MVP bem resolvido p/ PDV + catálogo + financeiro de recebíveis). É **genérico de varejo** (pouco acoplado a moda), o que favorece expansão a outros nichos. Porém, **não possui multi-tenancy** — fator bloqueador para torná-lo **SaaS comercial multi-loja**. Arquitetura é **evolucionável (incremental)**, não exigindo reconstrução. Foco recomendado: **P0 (Multi-tenancy + RBAC + Integridade Histórico + Atomicidade Estoque)**.

### 2. ARQUITETURA ATUAL
Monolítica simplificada: Frontend (SPA) → API REST (Controllers) → EF Core → PostgreSQL. Regras em Controllers. Sem camada Domain/Application formal. Single-tenant implícito.

### 3. MAPA DE DOMÍNIO
Entidades: User, Product, Customer, Order, OrderItem, Installment, StoreSetting. Domínios: Auth/Users, Produtos/Catálogo, Clientes, Pedidos/Vendas, Financeiro(Recebíveis), Relatórios, Configurações.

### 4. MULTI-TENANCY
**Ausente.** Sem TenantId. Sem isolamento. `[Authorize] ≠ isolamento por tenant`. Classificação: **🔴 Risco de vazamento (sem escopo)**. Modelo atual: single-tenant.

### 5. AUTH / ROLES
JWT OK. Roles string (`Vendedor/Administrador/Operador`). **RBAC não aplicado** (apenas `[Authorize]` em endpoints admin). Sem refresh token.

### 6. PRODUTOS
Mínimo (Title, Desc, Price, Stock, ImageUrl, Category string). Falta SKU, IsActive, Variações, Custo. Genérico.

### 7. CATEGORIAS
String livre. **Sem entidade/CRUD**. Não dinâmicas por entidade. Parcial.

### 8. CATÁLOGO
Público ([AllowAnonymous]), busca client-side, sem slug/tenant, sem paginação/filtros, não oculta Stock<=0. Estratégico, precisa evolução.

### 9. STORE SETTINGS
Básico (StoreName, Phone, Address, LogoUrl). Falta branding completo + exposição pública.

### 10. CLIENTES
OK p/ V1. Find-or-create por nome (risco duplicados), unicidade fraca, CreditLimit não validado.

### 11. PEDIDOS
Core sólido. Unificado (Pedido+Venda). Falta cancelamento+estorno estoque, atomicidade, distinção explícita.

### 12. VENDAS
Implícitas em Order (Status). Sem entidade Sale/Pagamentos transacionais.

### 13. ESTOQUE
Campo único + baixa OK. Sem movimentações, reserva, estorno, concorrência robusta.

### 14. CAIXA
**Ausente.** Financeiro = recebíveis apenas.

### 15. VENDEDORES
Não associado a Order. Permite evolução (SellerId).

### 16. FRONTEND
SPA admin bem estruturado. Falta separação público/admin (catálogo com slug).

### 17. API
REST funcional, domínios cobertos parcialmente. Faltam Categories/Stock/Cash/Catalog público com escopo.

### 18. BANCO
Limpo, FKs corretas. **Alerta:** OrderItem→Product Cascade (histórico). Índices ausentes. Sem TenantId/ConcurrencyToken.

### 19. FLUXO COMERCIAL
Funciona PDV/balcão. Incompleto p/ e-commerce público multi-loja.

### 20. PRESERVAR
Ver seção 19 (stack, crediário, PDV, catálogo base, JWT, arquitetura pragmática).

### 21. CORRIGIR
Ver seção 20 (Multi-tenancy, RBAC, histórico, atomicidade, carrinho, unicidade, índices, catálogo).

### 22. RECONSTRUIR
**Nenhum** — apenas evoluir incrementalmente.

### 23. NÃO FAZER AGORA
Ver seção 22 (IA, CRM, Marketplace, BI avançado, etc., fora V1).

### 24. MODALINK V1
Ver seção 23 (tabela com status por módulo).

### 25. P0/P1/P2/P3
Ver seção 24 (ordenado por Impacto + Risco).

### 26. ROADMAP
Consolidado em P0 (bloqueadores) → P1 (V1) → P2 (melhorias) → P3 (futuro).

### 27. FLUXO FINAL DE VALIDAÇÃO
Suportado PDV. Quebras: slug/tenant, carrinho API, Caixa, estorno estoque (detalhado seção 25).

---

**Conclusão Final:** ModaLink tem **radiografia arquitetural sólida** para MVP single-tenant. Para torná-lo **SaaS comercial real (multi-tenant, genérico p/ múltiplos nichos de varejo)**, o caminho é **evolutivo**, com **P0 obrigatório** antes de escalar multi-loja. **Não foi possível confirmar na auditoria** qualquer implementação de multi-tenancy — está completamente ausente.

