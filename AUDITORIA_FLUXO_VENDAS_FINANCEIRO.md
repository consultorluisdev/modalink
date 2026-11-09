# AUDITORIA TÉCNICA — MODALINK
## Fluxo de vendas, pedidos, crediário e recebimentos

**Data:** 09/11/2026
**Escopo:** `backend/ModaLink.Api`, `frontend/modalink-frontend`, banco PostgreSQL em execução (`modalink_postgres`)
**Modo:** somente leitura. Nenhum arquivo, migration ou registro foi alterado durante a auditoria.

---

## 1. Resumo executivo

O ModaLink possui um fluxo de venda funcional para o cenário simples (PDV → pedido → baixa de estoque → parcelas → financeiro), mas **não está pronto para operar em loja real com integridade financeira** sem correções P0.

O que funciona:
- Criação de pedido com itens, cálculo de subtotal/desconto/total e baixa de estoque em transação.
- Geração de parcelas de crediário com juros simples, entrada e ajuste de arredondamento.
- Financeiro lista parcelas, calcula a receber/vencido/a vencer/recebido no mês e permite baixar/reabrir parcela.
- Clientes e Pedidos consomem dados reais da API.

O que está crítico:
- **O banco real tem `ON DELETE CASCADE` de `Products` para `OrderItems`**, embora o `AppDbContext` declare `Restrict`. Apagar um produto apaga itens de pedidos históricos.
- **Recebimento não é idempotente nem validado**: aceita baixar parcela já paga, valor negativo e sobrepagamento, sobrescrevendo `PaidAt`/`PaidAmount` sem histórico.
- **Status da venda não evolui**: crediário quitado continua `Pending`.
- **Entrada (down payment) não é registrada como recebimento**; o “recebido no mês” ignora a entrada e o `Order.Total` não bate com `entrada + parcelas`.
- **Concorrência de estoque** permite vender a última unidade duas vezes.
- **Validação de entrada ausente** na venda (quantidade/preço negativos, desconto maior que subtotal, parcelas inválidas, itens vazios).

Veredito: **não pronto para entrada de clientes reais** antes de corrigir P0-01, P0-02, P0-03, P0-04, P0-05 e P0-06.

---

## 2. Arquitetura atual identificada

- **Backend:** ASP.NET Core 8, Controllers → EF Core (`AppDbContext`) direto, sem Service Layer/Repositories.
- **Entidades:** `User`, `Product`, `Customer`, `Order`, `OrderItem`, `Installment`, `StoreSetting`.
- **Frontend:** React 19 + Vite + Axios; rotas protegidas por `PrivateRoute`; `AuthContext` com token em `localStorage`.
- **Banco:** PostgreSQL 15; migrations aplicadas automaticamente no boot (`Program.cs:57-61`).
- **Não existem:** `Payment`, `StockMovement`, `CashRegister`, entidade de cancelamento/estorno, histórico de recebimentos.

Fluxo macro real:

```
NovaVenda.tsx → POST /api/orders
   → OrdersController.Create
      → find-or-create Customer (por nome)
      → monta Order + OrderItems (calcula subtotal/desconto/total)
      → gera Installments (se Crediário)
      → valida estoque (fora da transação)
      → transação: salva Order, decrementa Stock, commit
Financeiro.tsx → GET /api/finances/receivable
               → POST /api/finances/installments/{id}/pay|unpay
Pedidos.tsx → GET /api/orders e GET /api/orders/{id}
Clientes.tsx → GET/POST/PUT /api/customers
```

---

## 3. Fluxo real de venda

1. **Criação no PDV:** `frontend/.../pages/vendas/NovaVenda.tsx`. Carrinho local; ao submeter, `orderService.create` chama `POST /api/orders` (`NovaVenda.tsx:104-143`).
2. **Endpoint:** `OrdersController.Create` (`OrdersController.cs:152-270`), `[Authorize]` (qualquer role autenticada).
3. **Cálculo de valores:** `subtotal = Σ(Quantity * UnitPrice)`; `discount = dto.Discount`; `total = subtotal - discount` (`OrdersController.cs:177-179`). O preço vem do frontend (`unitPrice`), **não é revalidado contra o preço do produto no banco**.
4. **Cliente associado:** por **nome exato** (`FirstOrDefaultAsync(c => c.Name == dto.CustomerName)`), criando novo se não existir (`OrdersController.cs:157-174`). Não há `CustomerId` no DTO.
5. **Estoque:** validado **antes** da transação (`:234-242`) e decrementado **dentro** da transação, relendo item a item (`:251-259`).
6. **Transação:** `BeginTransactionAsync` envolve `Orders.Add` + `SaveChanges` + decremento de estoque + `SaveChanges` + `Commit` (`:244-268`). A criação do cliente ocorre **fora** da transação (`:172-173`).
7. **Validações que impedem venda inválida:** apenas produto existente e estoque suficiente. Não há validação de quantidade > 0, preço > 0, desconto ≤ subtotal, itens não vazios, parcelas > 0, entrada ≤ total, cliente obrigatório.
8. **Status possíveis (código atual):**
   - `Pending`: `PaymentMethod == "Crediário" && InstallmentCount > 0` (`:188`).
   - `Paid`: qualquer outro caso.
   - `Completed`: **legado** encontrado no banco real (pedido #3), não gerado pelo código atual.
   - `Cancelled`: existe no `Badge`/tipo do frontend, mas **nunca é gravado** e não há endpoint de cancelamento.

**Distinção conceitual:** hoje o sistema usa **um único campo** (`Order.Status`) para representar situação operacional e financeira; `PaymentMethod` é string livre. Não há status de pagamento separado do status do pedido.

---

## 4. Fluxo real do crediário

1. **Identificação:** string `PaymentMethod == "Crediário"` (comparação sensível a caixa/acento) e `InstallmentCount > 0` (`OrdersController.cs:188,203`).
2. **Geração das parcelas:** `for i = 1..InstallmentCount` (`:216-225`).
3. **Cálculo:**
   - `amountToFinance = total - DownPayment` (`:206-210`).
   - `totalWithInterest = amountToFinance * (1 + InterestRate * InstallmentCount / 100)` (`:212-213`).
   - `installmentAmount = Round(totalWithInterest / InstallmentCount, 2)` (`:214`).
   - Última parcela ajustada pela diferença de arredondamento (`:227-231`).
   - `DueDate = UtcNow.AddMonths(i)` — primeira parcela vence 1 mês após a venda.
4. **Entrada:** armazenada em `Order.DownPayment`, usada apenas para reduzir o valor financiado. **Não gera parcela, não gera recebimento, não entra no financeiro.**
5. **Limite de crédito:** `Customer.CreditLimit` existe, mas **não é validado em nenhum ponto**.
6. **Saldo devedor:** calculado on-the-fly a partir das parcelas não pagas (`CustomersController.cs:47-50`, `FinancesController.cs:127`). Não é persistido.
7. **Parcelas abertas/vencidas/recebidas:** derivadas de `IsPaid` e `DueDate < UtcNow` (backend) / data local (frontend).
8. **Receber duas vezes:** **sim**, o endpoint aceita e sobrescreve os dados (`FinancesController.cs:86-100`).
9. **Cancelamento/estorno:** **inexistente**. Não há endpoint de cancelar pedido, estornar estoque ou anular parcelas.
10. **Parcelas × valor da venda:** a soma das parcelas corresponde ao valor **financiado com juros**, não ao `Order.Total`. Evidência real (banco): pedido #1 `Total=119,90`, entrada `15`, soma parcelas `114,34` → total efetivo `129,34` (juros `9,44`).

---

## 5. Fluxo real de recebimento

- **Resumo:** `GET /api/finances/receivable/summary` (`FinancesController.cs:57-84`).
- **Lista de parcelas:** `GET /api/finances/receivable` (`:18-55`).
- **Baixa:** `POST /api/finances/installments/{id}/pay` (`:86-100`).
- **Reabertura:** `POST /api/finances/installments/{id}/unpay` (`:102-116`).
- **Total a receber:** soma de `Installments` com `IsPaid == false` (`:27`).
- **Recebido no mês (lista):** `PaidAt.Month == UtcNow.Month` **sem comparar o ano** (`:29`) — bug.
- **Recebido no mês (summary):** filtra mês **e** ano corretamente (`:69-71`).
- **Vencido:** `!IsPaid && DueDate < UtcNow` (`:31`).
- **A vencer:** `!IsPaid && DueDate >= UtcNow` (`:32`).
- **Filtros:** no frontend, sobre `data.items` localmente (busca por cliente/venda e abas Todas/Em aberto/Vencidas/Recebidas — `Financeiro.tsx:124-146`). Os cards de resumo **não** são afetados pelos filtros; usam os totais globais da API (`:148-185`).
- **Data do recebimento:** persistida em `PaidAt` (UTC).
- **Forma de recebimento:** **não persistida**.
- **Histórico de recebimentos:** **não existe**. `Unpay` apaga `PaidAt`/`PaidAmount`; nova baixa sobrescreve os valores anteriores.

---

## 6. Integração entre módulos

| Origem → Destino | Como integra | Risco |
|------------------|--------------|-------|
| PDV → Pedido | `POST /orders` cria `Order` + `OrderItem` | Preço/quantidade vêm do cliente sem revalidação |
| Pedido → Estoque | `Product.Stock -= Quantity` na transação | Sem lock/concurrency; validação antes da transação |
| Pedido → Cliente | find-or-create por nome | Duplicidade; não usa e-mail/telefone/ID |
| Pedido → Crediário | gera `Installment` no mesmo insert | `Order.Total` não inclui juros; entrada não vira recebimento |
| Crediário → Financeiro | Financeiro lê `Installments` | Status do pedido não muda ao quitar |
| Produto → Histórico | FK `OrderItem.ProductId` | **CASCADE no banco real** apaga histórico |
| Cliente → Histórico | FK `Order.CustomerId` | `SET NULL` ao excluir cliente; pedido perde vínculo |
| Financeiro → Clientes | ambos somam parcelas | Consistente entre si, mas herda divergências de juros/entrada |

---

## 7. Auditoria do banco

### Entidades e relacionamentos (confirmados no banco real)

| Entidade | PK | FKs / Relacionamentos | Regra de exclusão no banco |
|----------|----|-----------------------|----------------------------|
| `Customers` | `Id` | 1:N `Orders` | — |
| `Products` | `Id` | 1:N `OrderItems` | **`ON DELETE CASCADE` (confirmado)** |
| `Orders` | `Id` | N:1 `Customers` (`CustomerId`, nullable); 1:N `OrderItems`; 1:N `Installments` | `CustomerId` → `SET NULL` |
| `OrderItems` | `Id` | N:1 `Orders`; N:1 `Products` | `OrderId` → `CASCADE`; `ProductId` → `CASCADE` |
| `Installments` | `Id` | N:1 `Orders` | `OrderId` → `CASCADE` |
| `StoreSettings` | `Id` | singleton | — |
| `Users` | `Id` | — | — |

> **Divergência crítica:** `AppDbContext.cs:44-47` declara `Restrict` para `Product`, mas a migration `20260531015629_InitialCreate.cs` e o snapshot ainda definem `Cascade`, e o banco em execução confirma `FK_OrderItems_Products_ProductId ... ON DELETE CASCADE`. **A alteração do modelo não foi acompanhada de migration.**

### Índices existentes (banco real)

- PKs em todas as tabelas.
- `IX_OrderItems_OrderId`, `IX_OrderItems_ProductId`, `IX_Orders_CustomerId`, `IX_Installments_OrderId`.
- `IX_StoreSettings_Id`.
- **Ausentes:** índices em `Orders.CreatedAt`, `Installments.DueDate`, `Installments.IsPaid`, `Orders.Status`, `Customers.Email` (e nenhum `UNIQUE`).

### Tipos monetários

- `numeric(18,2)` em `Products.Price`, `Orders.Subtotal/Discount/Total`, `OrderItems.UnitPrice/TotalPrice`, `Installments.Amount/PaidAmount`.
- `DownPayment`, `InterestRate`, `CreditLimit` foram criados como `numeric` **sem precisão/escala** (`AddInstallments.cs:16-38`), diferente do restante.
- `Stock` é `integer`; sem tabela de movimentações.

### Auditoria / rastreabilidade

- Não há `CreatedBy`, `UpdatedBy`, `CancelledAt`, `PaymentMethod` de recebimento, nem log de alterações.
- `PaidAt`/`PaidAmount` são sobrescritos; não há histórico.

---

## 8. Testes executados e resultados

| Teste | Comando | Resultado |
|-------|---------|-----------|
| Build backend | `dotnet build` | ✅ 0 erros, 0 avisos |
| Typecheck frontend | `npx tsc --noEmit -p tsconfig.app.json` | ✅ 0 erros |
| Lint frontend | `npm run lint` | ✅ 0 erros |
| Build frontend | `npm run build` | 🔴 `EACCES` em `node_modules/.tmp` (pasta pertence a `root`) — ambiente, não código |
| Testes automatizados | — | 🔴 **não existem** (nenhum projeto de teste) |
| Testes de serviços financeiros | — | 🔴 não existem |
| Testes de criação de venda/parcelas/recebimento | — | 🔴 não existem |
| Testes destrutivos no banco | — | ⛔ **não executados** (proibido pela auditoria) |

Consultas **somente leitura** executadas no `modalink_postgres`:

- 3 pedidos, 3 itens, 18 parcelas, 4 clientes, 2 produtos; **0 parcelas pagas**.
- Status distintos: `Pending` (2) e `Completed` (1 — legado).
- Divergência real entre `Order.Total`, entrada e soma de parcelas (pedidos #1, #2, #3).
- Constraint real `FK_OrderItems_Products_ProductId ON DELETE CASCADE`.
- `admin@admin.com` está com `Role = "Vendedor"` (não é Administrador).

Conclusão dos testes: **não há cobertura automatizada**; os cenários B–G não podem ser validados dinamicamente sem ambiente de teste isolado.

---

## 9. Problemas encontrados

### P0 — Crítico (7)

**P0-01 — Cascade de produto apaga histórico de pedidos**
- Arquivo: `backend/ModaLink.Api/Migrations/20260531015629_InitialCreate.cs:102-108`; `Migrations/AppDbContextModelSnapshot.cs:329-330`; `Data/AppDbContext.cs:44-47`.
- Evidência: banco real `FK_OrderItems_Products_ProductId ... ON DELETE CASCADE`; modelo diz `Restrict` sem migration.
- Impacto: apagar um produto remove itens de vendas antigas, alterando histórico e relatórios; perda de dados financeiros.
- Recomendação: criar migration `Cascade → Restrict/NoAction`, soft delete de produto e retorno 409 ao excluir produto vendido.

**P0-02 — Recebimento sem validação/idempotência**
- Arquivo: `Controllers/FinancesController.cs:86-100` (`PayInstallment`), `:102-116` (`UnpayInstallment`).
- Evidência: não verifica `IsPaid`, não valida valor (>0, ≤ saldo), não usa transação, sobrescreve `PaidAt`/`PaidAmount`.
- Impacto: baixa duplicada, sobrepagamento, valores negativos, caixa incorreto, sem rastreabilidade.
- Recomendação: rejeitar parcela já paga (409), validar valor, registrar `Payment`/histórico, chave de idempotência, transação.

**P0-03 — Status da venda não vira `Paid` ao quitar**
- Arquivo: `Controllers/FinancesController.cs:86-100`; `Controllers/OrdersController.cs:188`.
- Evidência: `PayInstallment` só altera a parcela; `Order.Status` nunca é recalculado.
- Impacto: crediário 100% pago continua “Pendente”; tela de Pedidos e dashboard mentem.
- Recomendação: ao pagar/reabrir, recalcular `Order.Status` (ex.: `Pending`/`Paid`) em transação.

**P0-04 — Entrada não registrada e total da venda divergente**
- Arquivo: `Controllers/OrdersController.cs:177-232`; `Models/Order.cs:14-16`; `Controllers/FinancesController.cs:27-30`.
- Evidência real: pedido #1 `Total=119,90`, entrada `15`, parcelas `114,34` → `129,34`; entrada não aparece em nenhum recebimento.
- Impacto: “recebido no mês” subestima o caixa; `Order.Total` não reconcilia com parcelas; fechamento impossível.
- Recomendação: persistir `FinancedAmount`/`InterestAmount`/`TotalWithInterest` e registrar a entrada como pagamento imediato.

**P0-05 — Concorrência de estoque**
- Arquivo: `Controllers/OrdersController.cs:234-262`.
- Evidência: validação de estoque antes da transação; dentro da transação relê o produto e decrementa sem revalidar/lock.
- Impacto: dois vendedores vendem a última unidade; estoque negativo ou venda sem produto.
- Recomendação: validar e decrementar na mesma transação com `ConcurrencyToken`/`SELECT ... FOR UPDATE` ou `ExecuteUpdate` condicional (`Stock >= qty`).

**P0-06 — Ausência de validação de entrada na venda**
- Arquivo: `DTOs/CreateOrderDto.cs`; `Controllers/OrdersController.cs:152-232`.
- Evidência: aceita quantidade/preço negativos, `Discount > Subtotal`, `Items` vazio, `InstallmentCount` inválido, `DownPayment > Total`.
- Impacto: totais negativos, aumento indevido de estoque, parcelas negativas, corrupção financeira.
- Recomendação: DataAnnotations/FluentValidation + validações de negócio no controller/serviço.

**P0-07 — Registro público e RBAC fraco**
- Arquivo: `Controllers/AuthController.cs:25-46`; controllers com `[Authorize]` apenas.
- Evidência: qualquer visitante cria `Vendedor` e acessa clientes/pedidos/financeiro; escritas de produto/cliente/parcela sem role específica.
- Impacto: vazamento e fraude de dados da loja.
- Recomendação: desativar registro público/convite, aplicar roles nas escritas e revogar token de inativo.

### P1 — Alto (9)

**P1-01 — `totalPaidThisMonth` ignora o ano**
- `FinancesController.cs:29`. Filtra só `PaidAt.Month`. Impacto: recebido do mês inflado com anos anteriores. Recomendação: comparar mês **e** ano (como no summary).

**P1-02 — `Order.Total` não inclui juros/financiado**
- `OrdersController.cs:177-232`. Impacto: dashboard/relatórios subestimam recebíveis e vendas reais. Recomendação: persistir e exibir `TotalWithInterest`/`FinancedAmount`.

**P1-03 — Cliente identificado por nome exato**
- `OrdersController.cs:157-174`. Impacto: “João” e “João ” viram clientes distintos; histórico e saldo fragmentados. Recomendação: `CustomerId` no DTO, normalização e unicidade por telefone/e-mail/documento.

**P1-04 — Exclusão de cliente zera vínculo do pedido**
- `AppDbContext.cs:30-33`; `CustomersController.cs:168-178`. Impacto: pedidos/financeiro perdem o cliente; aparece “Consumidor Final”. Recomendação: soft delete/desativar cliente.

**P1-05 — Status legado `Completed` e semântica inconsistente**
- Banco real (pedido #3 `Completed`); `components/uI/Badge.tsx:5-25`. Impacto: UI exibe “Completed” cru; status não representa estado financeiro. Recomendação: normalizar dados e documentar máquina de estados.

**P1-06 — Sem cancelamento/estorno de venda**
- Nenhum endpoint em `OrdersController`. Impacto: erros de venda não podem ser revertidos; estoque/parcelas ficam errados. Recomendação: `POST /orders/{id}/cancel` com transação e estorno.

**P1-07 — Sem forma de pagamento nem histórico de recebimento**
- `Models/Installment.cs:10-12`; `FinancesController.cs:86-116`. Impacto: não se sabe como/por quem/quando cada parcela foi recebida; `Unpay` apaga rastro. Recomendação: entidade `Payment`/log imutável.

**P1-08 — Limite de crédito não validado**
- `Customer.CreditLimit` sem uso em `OrdersController`. Impacto: risco de crédito. Recomendação: validar saldo devedor + nova venda ≤ limite.

**P1-09 — E-mail sem UNIQUE e login sensível a caixa**
- Migrations (sem índice único); `AuthController.cs:28,52-53`. Impacto: usuários duplicados em corrida; login falha por caixa. Recomendação: índice único em e-mail normalizado.

### P2 — Médio (11)

| ID | Problema | Arquivo/Evidência | Impacto |
|----|----------|-------------------|---------|
| P2-01 | Detalhe do pedido não mostra parcelas/recebimentos, embora a API retorne | `components/uI/OrderDetailModal.tsx:55-108`; `types/order.types.ts:18-28` | Não consulta crediário no pedido |
| P2-02 | Busca de pedidos sem debounce | `pages/orders/Orders.tsx:14-27` | Request a cada tecla |
| P2-03 | “Tentar novamente/Atualizar” de Relatórios é no-op | `pages/Reports/index.tsx:69,99` (`setPeriod(p => p)`) | Usuário preso no erro |
| P2-04 | Agregações em memória e sem paginação/índices | `OrdersController.cs:52-58`; `FinancesController.cs:21-25`; `ReportsController.cs:31-33` | Degradação com volume |
| P2-05 | `StoreSetting` singleton sem constraint | `StoreSettingsController.cs:22-33` | Duplicação em corrida |
| P2-06 | Upload sem MIME/tamanho; delete de produto retorna 500 | `ProductsController.cs:26-47,92-107,113-124` | Segurança/erro 500 (agravado por P0-01) |
| P2-07 | Sem exception handler global | `Program.cs` | Erros viram 500 sem padrão |
| P2-08 | “Vendas (mês)” do Dashboard usa total geral | `pages/Dashboard.tsx:64`; `OrdersController.cs:60` | Indicador enganoso |
| P2-09 | “Total gasto” do cliente soma pedidos pendentes | `CustomersController.cs:46` | Não representa receita recebida |
| P2-10 | Pedido de cliente excluído exibe nome vazio | `OrdersController.cs:39,119` | Histórico incompleto |
| P2-11 | Artefatos no Git, sem `.dockerignore`, frontend dev no Docker | `bin/obj/wwwroot` rastreados; `docker/docker-compose.yml:46` | Repo sujo, ambiente frágil |

### P3 — Baixo (5)

| ID | Problema | Evidência |
|----|----------|-----------|
| P3-01 | `Pending` usa texto vermelho em fundo amarelo | `Badge.tsx:8` |
| P3-02 | `App.tsx` é template Vite morto | `src/App.tsx` |
| P3-03 | Busca/notificação do TopBar são decorativas | `TopBar.tsx:28-41` |
| P3-04 | Vencimento em UTC no backend × data local no frontend | `FinancesController.cs:31-32`; `Financeiro.tsx:35-45` |
| P3-05 | `start.sh` anuncia pgAdmin 5050, compose usa 5051 | `start.sh:27`; `docker/docker-compose.yml:62` |

---

## 10. Riscos para operação em loja real

1. **Perda de histórico por exclusão de produto** (P0-01) — risco contábil direto.
2. **Caixa e contas a receber divergentes** (P0-04, P1-01, P1-02) — fechamento diário não confiável.
3. **Baixa duplicada/incorreta de parcela** (P0-02) — perda financeira e disputas com cliente.
4. **Venda da última unidade em duplicidade** (P0-05) — promessa de venda sem estoque.
5. **Status do pedido errado após quitação** (P0-03) — cobrança indevida/atendimento confuso.
6. **Cliente duplicado e saldo fragmentado** (P1-03) — limite de crédito e cobrança errados.
7. **Venda inválida aceita** (P0-06) — valores negativos e estoque inconsistente.
8. **Sem cancelamento** (P1-06) — erros operacionais não corrigíveis.
9. **Sem trilha de auditoria** (P1-07) — impossível saber quem recebeu/alterou.
10. **Acesso indevido** (P0-07) — exposição de dados da loja.

---

## 11. Recomendações técnicas

1. **Corrigir schema primeiro:** migration para `Restrict` em `OrderItems.ProductId`, adicionar `UNIQUE` em e-mail normalizado, índices em `Orders.CreatedAt`, `Installments.DueDate/IsPaid`.
2. **Introduzir `Payment` (ou `InstallmentPayment`) imutável:** valor, método, data, usuário, parcela; baixa passa a inserir registro e atualizar `Installment` em transação.
3. **Idempotência e validação de baixa:** rejeitar parcela paga, valor ≤ saldo, valor > 0, `Idempotency-Key`.
4. **Persistir valores do crediário:** `FinancedAmount`, `InterestAmount`, `TotalWithInterest`, `DownPaymentPaidAt`; registrar entrada como `Payment`.
5. **Máquina de estados explícita:** separar `Order.Status` (operacional) de `Order.PaymentStatus` (financeiro) e recalcular ao pagar/reabrir/cancelar.
6. **Cancelamento/estorno transacional:** repor estoque, cancelar parcelas em aberto, registrar estorno.
7. **Concorrência de estoque:** `UPDATE Products SET Stock = Stock - @qty WHERE Id=@id AND Stock >= @qty` (ou `ConcurrencyToken`), dentro da transação.
8. **Validação robusta:** FluentValidation/DataAnnotations + regras de negócio; preço do item deve vir do produto (não do cliente).
9. **Cliente confiável:** `CustomerId` no pedido; unicidade por documento/telefone/e-mail; normalização.
10. **Testes:** criar projeto xUnit de integração com Testcontainers/PostgreSQL e cobrir cenários A–G; CI.
11. **Observabilidade:** exception handler global, logs estruturados e auditoria de ações financeiras.
12. **Infra:** remover `bin/obj/wwwroot` do Git, adicionar `.dockerignore`, build estático do frontend em produção.

---

## 12. Plano de correção priorizado

### Fase 1 — Integridade financeira (P0, bloqueia go-live)
1. P0-01 Migration `Restrict` + soft delete de produto.
2. P0-02 Baixa idempotente/validada + `Payment` imutável.
3. P0-04 Registrar entrada e persistir valores do crediário.
4. P0-03 Recalcular `Order.Status`/`PaymentStatus`.
5. P0-05 Concorrência de estoque.
6. P0-06 Validação de venda (DTO + negócio).
7. P0-07 Fechar registro público + RBAC de escrita + revogação de token.

### Fase 2 — Consistência (P1)
8. P1-01 Corrigir recebido no mês (ano).
9. P1-02 Exibir/persistir total com juros.
10. P1-03 Cliente por ID + unicidade.
11. P1-04 Soft delete de cliente.
12. P1-05 Normalizar status legado + Badge.
13. P1-06 Cancelamento/estorno.
14. P1-07 Histórico de recebimentos.
15. P1-08 Limite de crédito.
16. P1-09 UNIQUE de e-mail.

### Fase 3 — Operação e UX (P2)
17. P2-01 Exibir parcelas/recebimentos no detalhe do pedido.
18. P2-02 Debounce; P2-03 retry real; P2-04 paginação/índices.
19. P2-05 constraint de `StoreSetting`; P2-06 validação de upload; P2-07 exception handler.
20. P2-08/09/10 corrigir indicadores e nomes.
21. P2-11 limpar repo e Docker.

### Fase 4 — Refinamento (P3)
22. P3-01..05 ajustes visuais/timezone/portas.

### Cenários de negócio

| Cenário | Situação | Observação |
|---------|----------|------------|
| A — Venda à vista R$ 200 | 🟡 Atende parcialmente | Pedido `Paid` e estoque baixado; **não gera registro de pagamento** |
| B — Crediário R$ 500 em 5x100 | 🟡 Atende parcialmente | Parcelas corretas sem juros; com juros, parcelas > `Total`; limite não validado |
| C — Recebimento parcial | 🟡 Atende parcialmente | Baixa funciona e reduz “a receber”; sem método/histórico; status não muda |
| D — Quitação | 🔴 Não atende | Parcelas ficam pagas, mas pedido continua `Pending` |
| E — Recebimento duplicado | 🔴 Não atende | Endpoint aceita de novo e sobrescreve `PaidAt`/`PaidAmount` |
| F — Venda cancelada | 🔴 Não atende | Não existe cancelamento/estorno; exclusão de produto apaga histórico |
| G — Concorrência da última unidade | 🔴 Não atende | Sem lock/validação dentro da transação |

---

## Resumo final

- **Problemas:** P0 = **7** · P1 = **9** · P2 = **11** · P3 = **5** (total **32**).
- **Fluxo de vendas:** funcional no caso simples; **não confiável** para operação real (validação, concorrência, histórico e status).
- **Crediário:** gera parcelas com juros e arredondamento corretos, mas **entrada não é recebimento**, limite não é validado e status não evolui.
- **Recebimento:** baixa e indicadores funcionam no básico, mas **sem idempotência, validação, forma de pagamento ou histórico**.
- **Pronto para loja real?** **Não.** Corrigir os P0 antes de liberar clientes reais.
- **Top 5 prioridades:**
  1. P0-01 — Corrigir `ON DELETE CASCADE` de produto no banco.
  2. P0-02 — Baixa de parcela idempotente/validada com registro de pagamento.
  3. P0-04 — Registrar entrada e reconciliar `Total` × parcelas.
  4. P0-03 — Atualizar status do pedido ao quitar.
  5. P0-05 + P0-06 — Concorrência de estoque e validação de venda.
