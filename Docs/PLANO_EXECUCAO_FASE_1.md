# PLANO DE EXECUÇÃO — FASE 1 (P0)

> **Data:** 18/11/2026 · **Retomada de:** `Docs/PLANO_CONTINUACAO.md`
> **Base:** `Docs/AUDITORIA_FLUXO_VENDAS_FINANCEIRO.md` + `Docs/PLANO_CORRECAO_FASE_1.md`
> **Estado de partida:** Fase 0 concluída (`e41f68a8`), docs organizados (`6cb083d2`), build 0/0.
>
> **Atualização 18/11/2026:** o banco já tinha as migrations `20261113125223_FixProductDeleteBehavior` e `20261113130537_AddOrderFinancialsAndPayments` aplicadas (build de 13/11 no container). Os arquivos foram recuperados por decompilação do DLL do container, o modelo/snapshot foi alinhado ao banco e o **P0-01 está concluído**. O schema de `Payment` + campos financeiros também já existe; falta a lógica nos controllers.

---

## 1. Escopo e decisões (defaults travados)

| # | Tema | Decisão adotada |
|---|------|-----------------|
| 1 | Escopo | P0 do fluxo de vendas/financeiro + ajustes mínimos de frontend para não quebrar. Multi-tenancy = épico separado. |
| 2 | `unpay` | **Estorno**: marca `Payments.ReversedAt`, não apaga histórico. |
| 3 | Preço do item | Vem de `Product.Price` no banco; `UnitPrice` do DTO é **ignorado**. |
| 4 | Registro público | `POST /auth/register` restrito a `Administrador` + remover rota `/register` do frontend. |
| 5 | Estoque | `ExecuteUpdateAsync` condicional `WHERE Stock >= qty` dentro da transação; conflito → 409. |
| 6 | Pagamento parcial | API suporta (`amount` + `method`); UI completa (modal) fica na Fase 3. Nesta fase a UI envia sem valor (quita o saldo). |
| 7 | Cancelamento de venda (P1-06) | Fora desta fase. `OrderStatusService` já respeita `Cancelled`. |
| 8 | `bin/obj` no Git | Remover do índice em commit separado (`git rm -r --cached`) + `.gitignore`. Não bloqueia P0. |

### Fora de escopo
P1/P2/P3 (cliente por ID, soft delete de cliente, limite de crédito, UNIQUE de e-mail, paginação/índices extras, cancelamento de venda) e refatoração ampla de Service Layer. Só entra o `OrderStatusService`.

---

## 2. Pré-requisitos (executar antes de codar)

- [x] **Backup do banco** antes de qualquer migration:
  ```bash
  docker exec modalink_postgres pg_dump -U admin -d modalink_db > /tmp/modalink_backup_$(date +%Y%m%d_%H%M).sql
  ```
  Backup de 18/11: `/tmp/modalink_backup_20261118_222327.sql`.
- [x] **Fixar `dotnet-ef` 8.0.4 local** (global está 10.0.12 × EF Core 8.0.4):
  ```bash
  dotnet new tool-manifest
  dotnet tool install dotnet-ef --version 8.0.4
  ```
- [ ] **Garantir um Administrador ativo** antes de aplicar RBAC:
  ```bash
  docker exec modalink_postgres psql -U admin -d modalink_db -c \
    "SELECT \"Id\",\"Email\",\"Role\",\"IsActive\" FROM \"Users\";"
  ```
  `admin@admin.com` está como `Vendedor`. Promover um usuário (preferir `teste@gmail.com`) a `Administrador` **ativos** antes do passo 7.
- [x] Baseline: `dotnet build` = 0 erros / 0 avisos.
- [x] Confirmar constraint atual (já está `r`):
  ```bash
  docker exec modalink_postgres psql -U admin -d modalink_db -c \
    "SELECT conname, confdeltype FROM pg_constraint WHERE conname='FK_OrderItems_Products_ProductId';"
  ```

---

## 3. Ordem de execução

| Passo | Entrega | Depende de |
|-------|---------|------------|
| 1 | P0-01 — migration `FixProductDeleteBehavior` | ✅ concluído |
| 2 | P0-02/P0-04 — modelo `Payment`, campos financeiros e migration com backfill | 1 |
| 3 | P0-03 — `Common/OrderStatuses`, `Common/PaymentMethods`, `OrderStatusService` | 2 |
| 4 | P0-04/05/06 — reescrever `OrdersController.Create` | 2, 3 |
| 5 | P0-02/03/04 — `FinancesController` (pay/unpay/agregações) | 2, 3 |
| 6 | P0-07 — Auth, RBAC, revogação de token, rate limit | 2 |
| 7 | Frontend mínimo (tipos/saldo restante + remover registro) | 5, 6 |
| 8 | Validação (build + cenários A–G + SQL) | 1–7 |
| 9 | (Opcional) projeto `ModaLink.Api.Tests` | 8 |
| 10 | Atualizar docs + commits pequenos por P0 | 8 |

---

## 4. Tarefas detalhadas

### Passo 1 — P0-01: FK de produto `Cascade → Restrict` ✅ CONCLUÍDO

**Descoberta:** o banco já tinha a migration `20261113125223_FixProductDeleteBehavior` aplicada (`confdeltype='r'`), mas o arquivo não estava no repositório. O arquivo foi reconstruído a partir do DLL do container (decompilado) e o modelo/snapshot alinhados ao banco.

- [x] Migration `20261113125223_FixProductDeleteBehavior` restaurada (Up: `Cascade → Restrict`; Down: `Restrict → Cascade`).
- [x] `AppDbContextModelSnapshot` em `Restrict`; `dotnet ef migrations has-pending-model-changes` = sem mudanças.
- [x] `dotnet ef database update` = banco up-to-date (migration já constava no histórico).
- [x] `confdeltype = 'r'`; DELETE de produto com venda bloqueado pela FK (validado em transação com `ROLLBACK`).
- [x] `ProductsController.Delete` (`:113-136`) mantém o 409 por venda.

**Aceite:** atendido — produto com venda não pode ser excluído; itens de pedidos antigos preservados.

---

### Passo 2 — P0-02/P0-04: `Payment` imutável + campos financeiros + backfill ✅ SCHEMA CONCLUÍDO

**Situação:** o schema já existia no banco (migration `20261113130537_AddOrderFinancialsAndPayments` aplicada) e foi recuperado do DLL do container. O modelo `Payment`, os campos financeiros e o snapshot agora batem com o banco. Falta apenas a lógica nos controllers (Passos 4 e 5).

**`Models/Payment.cs` (restaurado):**
```csharp
public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int? InstallmentId { get; set; }            // null = entrada ou venda à vista
    public Installment? Installment { get; set; }
    public decimal Amount { get; set; }                // > 0
    public string? Method { get; set; }
    public DateTime PaidAt { get; set; }
    public int? UserId { get; set; }
    public string? IdempotencyKey { get; set; }
    public DateTime? ReversedAt { get; set; }          // estorno
}
```

> O schema aplicado **não** tem `Payment.CreatedAt` nem `Order.DownPaymentPaidAt`; a entrada é representada por `Payment` com `InstallmentId = NULL` e `PaidAt`.

**Alterar modelos:**
- `Models/Order.cs`: `FinancedAmount`, `InterestAmount`, `TotalWithInterest` (`decimal?`) + `List<Payment> Payments`.
- `Models/Installment.cs`: `List<Payment> Payments`.

**`Data/AppDbContext.cs`:**
- `DbSet<Payment>`.
- `numeric(18,2)` em `Amount`, `FinancedAmount`, `InterestAmount`, `TotalWithInterest`.
- `Payment.Order` → `Cascade`; `Payment.Installment` → `SetNull`.
- Índice único **filtrado** em `IdempotencyKey` (`WHERE "IdempotencyKey" IS NOT NULL`).
- Índice em `Payments(PaidAt)`.

**Migration `AddOrderFinancialsAndPayments`** (restaurada com backfill):
- [x] Colunas em `Orders` + tabela `Payments` + índices.
- [x] Backfill parcelas pagas → `Payment` ativo (`Amount = COALESCE(PaidAmount, Amount)`, `PaidAt = COALESCE(PaidAt, DueDate)`, `Method = 'Legado'`).
- [x] Backfill entradas → `Payment` (`InstallmentId = NULL`, `Amount = DownPayment`, `PaidAt = Order.CreatedAt`, `Method = 'Entrada (legado)'`).
- [x] Normalizar `UPDATE "Orders" SET "Status"='Paid' WHERE "Status"='Completed'`.
- [x] `Down` remove tabela/colunas (backfill não é recriado — manter backup).

**Aceite:** atendido no schema — 3 entradas legadas registradas em `Payments`; `FinancedAmount`/`InterestAmount`/`TotalWithInterest` recalculados; status `Completed` normalizado para `Paid`.

---

### Passo 3 — P0-03: constantes + `OrderStatusService`

**Criar `Common/OrderStatuses.cs`:** `Pending`, `Paid`, `Cancelled`.
**Criar `Common/PaymentMethods.cs`** com whitelist exata do frontend (`NovaVenda.tsx:292-296`):
`Pix`, `Cartão`, `Débito`, `Dinheiro`, `Crediário`.

**Criar `Services/OrderStatusService.cs`:**
```csharp
public async Task RecalculateAsync(int orderId, CancellationToken ct = default)
{
    var order = await _context.Orders
        .Include(o => o.Installments)
        .FirstAsync(o => o.Id == orderId, ct);

    if (order.Status == OrderStatuses.Cancelled) return;

    order.Status = order.Installments.Count == 0 ||
                   order.Installments.All(i => i.IsPaid)
        ? OrderStatuses.Paid
        : OrderStatuses.Pending;
}
```
- [ ] Registrar `AddScoped<OrderStatusService>()` em `Program.cs`.
- [ ] Chamar em `PayInstallment`/`UnpayInstallment` antes do `SaveChanges`, dentro da transação.

**Aceite:** quitar a última parcela → `Paid`; reabrir uma parcela → `Pending`; pedido `Cancelled` não muda.

---

### Passo 4 — P0-04/05/06: reescrever `OrdersController.Create`

Tudo em **uma transação** (incluindo find-or-create do cliente):

- [ ] Validar DTO (Passo 6) e normalizar `PaymentMethod` pela whitelist.
- [ ] Carregar produtos **`AsNoTracking`** por `Ids` uma única vez; rejeitar `ProductId` inexistente (400) e duplicado no payload (400).
- [ ] `UnitPrice = product.Price` do banco; calcular `subtotal` e `total` com `Math.Round(..., 2)`.
- [ ] Regras de negócio: `discount <= subtotal`, `total >= 0`, `downPayment <= total`; crediário exige `InstallmentCount` 1–12 e `downPayment < total`; juros só no crediário.
- [ ] Crediário: `financed = total - downPayment`, `totalWithInterest = financed * (1 + rate * count / 100)`, `interest = totalWithInterest - financed`; persistir os três + `DownPaymentPaidAt` quando houver entrada.
- [ ] Manter arredondamento/ajuste da última parcela (`OrdersController.cs:216-231`).
- [ ] **Pagamentos:** crediário com entrada → `Payment` (`InstallmentId = null`, `Amount = downPayment`); venda à vista → `Payment` do total (`InstallmentId = null`). `PaidAt = now`, `Method = dto.PaymentMethod`.
- [ ] **Status:** à vista → `Paid`; crediário → `Pending`.
- [ ] **Estoque (P0-05):** remover a validação pré-transação (`:234-242`) e decrementar por item:
  ```csharp
  var affected = await _context.Products
      .Where(p => p.Id == item.ProductId && p.Stock >= item.Quantity)
      .ExecuteUpdateAsync(s => s
          .SetProperty(p => p.Stock, p => p.Stock - item.Quantity)
          .SetProperty(p => p.UpdatedAt, _ => DateTime.UtcNow));
  if (affected == 0) { await transaction.RollbackAsync(); return Conflict(...); }
  ```
- [ ] `SaveChanges`/`Commit` uma vez; retornar `{ id, total, totalWithInterest, status }`.

**Aceite:** cenários A, B, G do relatório passam; preço adulterado no payload não altera total; duas vendas da última unidade → uma 200 e uma 409.

---

### Passo 5 — P0-02/03/04: `FinancesController`

**`PayInstallment`** (adicionar `[FromHeader(Name = "Idempotency-Key")] string? key`):
- [ ] Rejeitar pedido `Cancelled` (409).
- [ ] `remaining = Amount - (PaidAmount ?? 0)`; `<= 0` → 409 "parcela já quitada".
- [ ] `amount = dto?.Amount ?? remaining`; validar `> 0` e `<= remaining` (400).
- [ ] Idempotência: se `Payment` com a mesma `key` existe → retornar 200 sem inserir.
- [ ] Transação: inserir `Payment` (`ReversedAt = null`, `UserId` do token) + atualizar `PaidAmount`; se `>= Amount - 0.01` → `IsPaid = true`, `PaidAt = now`, `PaidAmount = Amount`; senão permanece parcial.
- [ ] Recalcular status via `OrderStatusService` na mesma transação.

**`UnpayInstallment`:**
- [ ] Marcar `Payments` ativos da parcela com `ReversedAt = now` (não apagar).
- [ ] `IsPaid = false`, `PaidAt = null`, `PaidAmount = null`; recalcular status. Entrada (`InstallmentId == null`) não é revertida aqui.

**Agregações:**
- [ ] `remaining(i) = i.IsPaid ? 0 : i.Amount - (i.PaidAmount ?? 0)`.
- [ ] `totalReceivable` = Σ `remaining` (não `Amount`).
- [ ] `totalPaidThisMonth` / `receivedThisMonth` = Σ `Payments` com `ReversedAt == null` e `PaidAt` no mês/ano (inclui entrada e à vista).
- [ ] `overdue` / `dueSoon` = Σ `remaining`.
- [ ] Itens expõem `amount`, `paidAmount`, `remainingAmount`, `method`.
- [ ] `GetCustomerBalance` e `/receivable/summary` usam `remaining`.

**Aceite:** recebimento parcial reduz `remaining` e mantém `Pending`; quitar o resto → `Paid`; duplicado → 409; mesma `Idempotency-Key` → 200 sem duplicar; reabrir estorna o histórico.

---

### Passo 6 — P0-06: validação de entrada

**`DTOs/CreateOrderDto.cs`:**
- [ ] `CustomerName` `[Required, MaxLength(200)]`; `PaymentMethod` `[Required]`.
- [ ] `Discount` `[Range(typeof(decimal), "0", "79228162514264337593543950335")]`.
- [ ] `InstallmentCount` `[Range(1, 12)]`; `DownPayment`/`InterestRate` não negativos.
- [ ] `Items` `[MinLength(1)]`.
- [ ] `CreateOrderItemDto.Quantity` `[Range(1, int.MaxValue)]`; manter `UnitPrice` no DTO por compatibilidade, mas **não usar**.

`[ApiController]` já converte DataAnnotations em 400. Regras de negócio ficam no `Create` (Passo 4).

---

### Passo 7 — P0-07: Auth, RBAC, revogação e rate limit

**`AuthController`:**
- [ ] `Register`: `[Authorize(Roles = "Administrador")]` (mantém `POST /auth/users` admin).
- [ ] `GenerateJwtToken`: trocar `AddDays(7)` (`:205`) por `AddHours(_configuration.GetValue<int?>("Jwt:ExpirationHours") ?? 2)`.

**`Program.cs`:**
- [ ] `JwtBearerEvents.OnTokenValidated`: extrair id (`ClaimTypes.NameIdentifier` ou `sub`), buscar `User` via `RequestServices`; se não existir ou `!IsActive` → `context.Fail("Usuário inativo")`.
- [ ] Rate limiting nos endpoints de auth (fixed window, ex. 10 req/min por IP) com `AddRateLimiter`/`UseRateLimiter` e `[EnableRateLimiting]` no `AuthController`.

**RBAC nas escritas** (GETs permanecem `[Authorize]`):
- [ ] `ProductsController`: Create/Update `Administrador,Vendedor`; Delete `Administrador`.
- [ ] `CustomersController`: Create/Update/Delete `Administrador,Vendedor`.
- [ ] `OrdersController.Create`: `Administrador,Vendedor`.
- [ ] `FinancesController`: Pay `Administrador,Vendedor`; Unpay `Administrador`.
- [ ] `StoreSettingsController.Update`: `Administrador`.

**Aceite:** registro sem token/role → 401/403; token de usuário desativado → 401; vendedor não exclui produto nem reabre parcela.

---

### Passo 8 — Frontend mínimo (não bloqueante, mas evita dados errados)

- [ ] `frontend/modalink-frontend/src/services/financeiroService.ts`: adicionar `remainingAmount`, `method?`, `remainingAmount` em `InstallmentItem`; `payInstallment(id, amount?, method?)` envia `{ amount, method }` e header opcional.
- [ ] `pages/financeiro/Financeiro.tsx`: exibir `remainingAmount` no lugar de `amount` para parcelas em aberto (tabela e painel de detalhes).
- [ ] `routes/index.tsx` / `pages/Login.tsx`: remover `import { Register }`, rota `/register`, `onRegister` e o bloco "Registre-se".
- [ ] Modal de recebimento parcial fica para a Fase 3 (backend já aceita `amount`).

---

## 5. Validação

```bash
# Backend
dotnet build
dotnet test                # se o projeto de testes existir

# Migrations aplicadas
docker exec modalink_postgres psql -U admin -d modalink_db -c \
  "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY 1 DESC LIMIT 3;"

# Frontend
cd frontend/modalink-frontend
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run build
```

**Matriz de cenários (manual via API/Swagger):**

| Cenário | Esperado |
|---------|----------|
| A — venda à vista R$ 200 | `Paid`, estoque baixado, `Payment` de 200 |
| B — crediário 5×100 | parcelas corretas, `Pending`, `Financed/Interest/TotalWithInterest` persistidos |
| C — recebimento parcial | `remainingAmount` cai, status `Pending`, `Payment` parcial |
| D — quitação | última baixa → `Paid` |
| E — duplicada | 409; mesma `Idempotency-Key` → 200 sem duplicar |
| F — produto com venda | DELETE → 409 (cancelamento de venda fica para Fase 2) |
| G — concorrência última unidade | uma venda 200, outra 409 |

---

## 6. Testes automatizados (recomendado, opcional nesta fase)

- [ ] Criar `backend/ModaLink.Api.Tests` (xUnit + `Microsoft.AspNetCore.Mvc.Testing` 8.0.4 + `Testcontainers.PostgreSql` + FluentAssertions).
- [ ] `public partial class Program { }` no fim de `Program.cs`.
- [ ] Casos mínimos: venda inválida → 400; entrada + `TotalWithInterest`; parcial → quitação; duplicado → 409; idempotência → 200; concorrência → 409; delete produto vendido → 409; registro sem admin → 403; token inativo → 401.

---

## 7. Riscos e rollback

| Risco | Mitigação |
|-------|-----------|
| Migration de FK falhar por órfãos | backup + validar órfãos antes |
| "Recebido no mês" zerar | backfill obrigatório de `Payment` |
| Duplicação de caixa (`Payment` × `PaidAmount`) | `Payment` é fonte de verdade; `PaidAmount` é cache derivado |
| RBAC travar operação | garantir Administrador ativo antes do passo 7 |
| `dotnet ef` 10 × EF Core 8 | tool local 8.0.4 |
| `ExecuteUpdate` ignorar change tracker | carregar produtos com `AsNoTracking`; não salvar entidades de produto |

**Rollback de schema:** `dotnet ef database update <migration-anterior>` (Down não recria backfill) — restaurar backup se necessário.

---

## 8. Checklist de progresso

- [x] Pré-requisitos (backup + `dotnet-ef` 8.0.4 local; admin pendente para o passo 7)
- [x] P0-01 migration `FixProductDeleteBehavior` (recuperada e alinhada)
- [x] P0-02/P0-04 `Payment` + campos + migration/backfill (schema)
- [ ] P0-03 `OrderStatusService`
- [ ] P0-04/05/06 `OrdersController.Create`
- [ ] P0-02/03/04 `FinancesController`
- [ ] P0-06 DataAnnotations/regras
- [ ] P0-07 Auth/RBAC/token/rate limit
- [ ] Frontend mínimo
- [ ] Cenários A–G validados
- [ ] Docs atualizados + commits por P0
