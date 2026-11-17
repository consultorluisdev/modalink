# PLANO DE CORREÇÃO — FASE 1 (P0)
## ModaLink — integridade de vendas, crediário e recebimentos

**Data:** 09/11/2026
**Base:** `AUDITORIA_FLUXO_VENDAS_FINANCEIRO.md`
**Escopo:** corrigir os 7 problemas P0. P1/P2/P3 ficam para fases seguintes.
**Status:** plano aprovado; decisões de design travadas.

---

## 0. Decisões travadas

| Tema | Decisão |
|------|---------|
| Pagamento parcial | **Suportado na Fase 1**, via API e modal na tela Financeiro |
| Reabertura (`unpay`) | **Marca pagamentos como estornados** (`Payments.ReversedAt`), sem apagar histórico |
| Exclusão de produto | **FK `Restrict` + HTTP 409**; sem soft delete nesta fase |
| RBAC de produto | Criar/editar: `Administrador,Vendedor`; excluir: `Administrador` |

### Princípios

1. **Backup do banco** antes de qualquer migration (`pg_dump`).
2. **Schema + backfill** primeiro; depois backend, frontend e testes.
3. Mudanças de API são **aditivas**; o payload atual do frontend continua válido.
4. Sem Service Layer amplo: apenas um `OrderStatusService` pequeno.
5. Toda mudança de schema entra com migration versionada; `Program.cs:60` aplica no boot.

### Matriz de arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `Models/Payment.cs` |
| Criar | `Services/OrderStatusService.cs` |
| Criar | `Common/OrderStatuses.cs`, `Common/PaymentMethods.cs` |
| Criar | migrations `FixProductDeleteBehavior`, `AddOrderFinancialsAndPayments` |
| Alterar | `Models/Order.cs`, `Models/Installment.cs`, `Data/AppDbContext.cs` |
| Alterar | `Controllers/OrdersController.cs`, `FinancesController.cs`, `AuthController.cs`, `ProductsController.cs`, `CustomersController.cs`, `StoreSettingsController.cs` |
| Alterar | `DTOs/CreateOrderDto.cs`, `Program.cs`, `appsettings.json` |
| Alterar | `frontend/.../routes/index.tsx`, `pages/Login.tsx`, `services/financeiroService.ts`, `pages/financeiro/Financeiro.tsx` |
| Criar | `backend/ModaLink.Api.Tests/` (xUnit + Testcontainers) |

---

## 1. P0-01 — Corrigir `ON DELETE CASCADE` de produto

**Diagnóstico confirmado:** `AppDbContext.cs:44-47` já declara `Restrict`, mas o snapshot (`AppDbContextModelSnapshot.cs:330`) e o banco real estão `Cascade`. O modelo foi alterado sem migration.

**Implementação**
- Migration `FixProductDeleteBehavior`:
  - `DropForeignKey("OrderItems", "FK_OrderItems_Products_ProductId")`
  - `AddForeignKey(..., onDelete: ReferentialAction.Restrict)`
- Atualizar snapshot via `dotnet ef`.
- `ProductsController.Delete` (`:113-124`): capturar `DbUpdateException` de FK e retornar **409** com “Produto possui vendas e não pode ser excluído”.

**Tooling:** `dotnet ef` global está em **10.0.12**, projeto usa EF Core **8.0.4**. Fixar ferramenta local:
```bash
dotnet new tool-manifest
dotnet tool install dotnet-ef --version 8.0.4
```

---

## 2. P0-02 + P0-04 — Pagamentos, entrada e valores do crediário

### 2.1 Novo modelo `Payment` (fonte de verdade do caixa)

```csharp
public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int? InstallmentId { get; set; }        // null = entrada
    public Installment? Installment { get; set; }
    public decimal Amount { get; set; }            // > 0
    public string? Method { get; set; }
    public DateTime PaidAt { get; set; }
    public int? UserId { get; set; }
    public string? IdempotencyKey { get; set; }
    public DateTime? ReversedAt { get; set; }      // estorno
}
```

- `Order` ganha `List<Payment> Payments`.
- `Installment` ganha `List<Payment> Payments`.
- `AppDbContext`:
  - `Payment.Order` → `Cascade`.
  - `Payment.Installment` → `SetNull`.
  - `Amount` com `numeric(18,2)`.
  - Índice único filtrado em `IdempotencyKey` (`WHERE "IdempotencyKey" IS NOT NULL`).
  - Índice em `Payments(PaidAt)`.

### 2.2 Novos campos em `Order`

- `FinancedAmount` (total − entrada)
- `InterestAmount` (juros totais)
- `TotalWithInterest` (financiado + juros)

Todos `numeric(18,2)` nullable. `Order.Total` continua sendo o valor da venda sem juros.

### 2.3 `OrdersController.Create` (`:152-270`)

Reescrever o miolo **dentro de uma única transação**:
1. Validar DTO (seção 5).
2. Normalizar `PaymentMethod` via `PaymentMethods`.
3. Carregar produtos por `ProductId`; validar existência e duplicidade de linha.
4. **Usar `product.Price` do banco** como `UnitPrice` (ignora preço vindo do cliente).
5. Calcular `subtotal`, validar `discount`, calcular `total`.
6. Calcular crediário:
   - `financed = total - downPayment`
   - `totalWithInterest = financed * (1 + rate * count / 100)`
   - `interest = totalWithInterest - financed`
   - gravar os três campos no `Order`.
7. Gerar parcelas (manter lógica de arredondamento de `:216-231`).
8. Se `downPayment > 0`, criar `Payment { OrderId, InstallmentId = null, Amount = downPayment, Method = dto.PaymentMethod, PaidAt = now }`.
9. Decrementar estoque de forma atômica (seção 4).
10. `SaveChanges` + `Commit`.
11. Retornar `{ id, total, totalWithInterest, status }`.

### 2.4 `FinancesController.PayInstallment` (`:86-100`)

- Carregar parcela + pedido.
- Rejeitar se pedido `Cancelled` (409).
- `remaining = Amount - (PaidAmount ?? 0)`; se `<= 0` → **409 “parcela já quitada”**.
- `amount = dto?.Amount ?? remaining`; validar `amount > 0` e `amount <= remaining` (400).
- Idempotência: se `IdempotencyKey` já existir, retornar o resultado anterior sem inserir.
- Inserir `Payment` (positivo).
- `PaidAmount = (PaidAmount ?? 0) + amount`; se `>= Amount` (epsilon 0,01) → `IsPaid = true`, `PaidAt = now`, `PaidAmount = Amount`; senão permanece parcial.
- Recalcular status do pedido (seção 3), na mesma transação.

### 2.5 `UnpayInstallment` (`:102-116`)

- Marcar pagamentos ativos da parcela com `ReversedAt = now` (não apagar).
- Zerar `PaidAmount`/`PaidAt`, `IsPaid = false`.
- Recalcular status. Transação única.
- Entrada (`InstallmentId == null`) **não** é revertida por este endpoint.

### 2.6 Cálculos do financeiro (`:18-148`)

- `remaining(i) = i.IsPaid ? 0 : i.Amount - (i.PaidAmount ?? 0)`.
- `totalReceivable` = Σ `remaining`.
- `totalPaidThisMonth` = Σ `Payments` com `ReversedAt == null` e `PaidAt` no **mês e ano** (inclui entradas).
- `overdue` / `dueSoon` = Σ `remaining` conforme `DueDate`.
- `GetSummary`: `totalPending` por `remaining`; `receivedThisMonth` por `Payments`.
- `GetCustomerBalance`: por `remaining`.
- Itens passam a expor `remainingAmount` e `paidAmount`.

### 2.7 Backfill (obrigatório na migration)

- Para cada `Installment` com `IsPaid = true`: inserir `Payment` com `Amount = COALESCE(PaidAmount, Amount)`, `PaidAt`, `Method = 'Legado'`.
- Para cada `Order` com `DownPayment > 0`: inserir `Payment` de entrada com `PaidAt = Order.CreatedAt`, `Method = 'Entrada (legado)'`.
- Sem backfill, o “recebido no mês” histórico zera.

---

## 3. P0-03 — Status do pedido ao quitar/reabrir

**Criar `Services/OrderStatusService.cs`**

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

- Registrar `AddScoped<OrderStatusService>()` em `Program.cs`.
- Chamar em `PayInstallment`/`UnpayInstallment` antes do `SaveChanges`, dentro da transação.
- Constantes em `Common/OrderStatuses.cs` (`Pending`, `Paid`, `Cancelled`).
- Na migration: `UPDATE "Orders" SET "Status"='Paid' WHERE "Status"='Completed'` (normaliza o legado do pedido #3).

---

## 4. P0-05 — Concorrência de estoque

Em `OrdersController.Create`, **remover** a validação pré-transação (`:234-242`) e decrementar condicionalmente dentro da transação:

```csharp
var affected = await _context.Products
    .Where(p => p.Id == item.ProductId && p.Stock >= item.Quantity)
    .ExecuteUpdateAsync(s => s
        .SetProperty(p => p.Stock, p => p.Stock - item.Quantity)
        .SetProperty(p => p.UpdatedAt, _ => DateTime.UtcNow));

if (affected == 0) { rollback; return Conflict(...); }
```

- Carregar produtos antes para obter preço e distinguir “não existe” (400) de “estoque insuficiente” (409).
- Rejeitar `ProductId` duplicado no payload (400).
- Manter `Order` + `OrderItems` + `Installments` + `Payments` + estoque na mesma transação.

---

## 5. P0-06 — Validação de entrada

**`DTOs/CreateOrderDto.cs`**
- `CustomerName`: `[Required]`, `[MaxLength(200)]`.
- `PaymentMethod`: `[Required]` + validação contra `PaymentMethods` (Pix, Cartão, Débito, Dinheiro, Crediário).
- `Discount`: `[Range(typeof(decimal), "0", "79228162514264337593543950335")]`.
- `InstallmentCount`: `[Range(1, 12)]`.
- `DownPayment`/`InterestRate`: `[Range]` não negativos.
- `Items`: `[MinLength(1)]`.
- `CreateOrderItemDto`: `Quantity` `[Range(1, int.MaxValue)]`; **remover `UnitPrice` do uso** (preço vem do banco).

**Regras de negócio em `Create`**
- `discount <= subtotal`; `total >= 0`.
- `downPayment <= total`; se `Crediário`, `InstallmentCount` obrigatório (1–12).
- `InterestRate` só permitido no crediário.
- Arredondar valores monetários com `Math.Round(..., 2)`.

`[ApiController]` já converte DataAnnotations em 400.

---

## 6. P0-07 — Registro, RBAC e revogação de token

**Backend**
- `appsettings.json`: `"Auth": { "AllowPublicRegistration": false }`.
- `AuthController.Register` (`:25-46`): se flag falsa → `StatusCode(403, new { message = "Registro público desativado" })`. Manter `POST /auth/users` admin.
- `Program.cs` (`:21-37`): `JwtBearerEvents.OnTokenValidated` que:
  - extrai o id (`ClaimTypes.NameIdentifier` ou `Sub`);
  - busca `User` no `AppDbContext` via `context.HttpContext.RequestServices`;
  - chama `context.Fail("Usuário inativo")` se não existir ou `!IsActive`.
- `AuthController.GenerateJwtToken` (`:205`): usar `Jwt:ExpirationHours` (default 2) em vez de `AddDays(7)`.
- RBAC:
  - `ProductsController` Create/Update: `Administrador,Vendedor`; Delete: `Administrador`.
  - `CustomersController` Create/Update/Delete: `Administrador,Vendedor`.
  - `OrdersController` Create: `Administrador,Vendedor`.
  - `FinancesController` Pay: `Administrador,Vendedor`; Unpay: `Administrador`.
  - `StoreSettingsController` Update: `Administrador`.
- **Pré-requisito operacional:** hoje `admin@admin.com` está como `Vendedor`. Garantir um usuário `Administrador` (existe `teste@gmail.com`) antes de aplicar as restrições. Opcional: warning no boot se não houver admin.

**Frontend**
- `routes/index.tsx`: remover `import { Register }` e a rota `/register` (`:4,75`).
- `pages/Login.tsx`: ocultar o bloco “Não tem uma conta? Registre-se” (`:143-152`).
- `routes/index.tsx:63`: remover `onRegister`.
- `api.ts` já desloga em 401 (`:21-25`), cobrindo token revogado.

---

## 7. Ajustes de frontend

- `services/financeiroService.ts`: adicionar `remainingAmount` e `paidAmount` em `InstallmentItem`; incluir `method` no `payInstallment`.
- `pages/financeiro/Financeiro.tsx`:
  - Exibir `remainingAmount` para parcelas em aberto (hoje mostra `amount` em `:400,493`).
  - **Modal de recebimento** com “Valor recebido” (default = saldo restante) e “Forma de pagamento”.
  - `handlePay` (`:82-101`) passa a enviar `{ amount, method }`.
  - Botão “Receber” abre o modal; confirmação final chama a API.
- `NovaVenda.tsx`: sem mudança obrigatória; o backend passa a ignorar `unitPrice` e usar o preço do banco.

---

## 8. Migrations e sequência

1. `FixProductDeleteBehavior`
   - FK `OrderItems.ProductId` → `Restrict`.
   - (Opcional) índices: `Orders(CreatedAt)`, `Installments(DueDate)`, `Installments(IsPaid)`.
2. `AddOrderFinancialsAndPayments`
   - colunas em `Orders`;
   - tabela `Payments` + índices + unique filtrado;
   - backfill de parcelas pagas e entradas;
   - normalização `Completed → Paid`.
3. `dotnet ef database update` em ambiente de teste primeiro; depois produção com backup.

> A migration de FK faz drop/recreate da constraint. Em volume baixo, a janela de lock é desprezível.

---

## 9. Testes e verificação

**Novo projeto `backend/ModaLink.Api.Tests`**
- Pacotes: `xunit`, `Microsoft.NET.Test.Sdk`, `Microsoft.AspNetCore.Mvc.Testing` 8.0.4, `Testcontainers.PostgreSql`, `FluentAssertions`.
- Adicionar `public partial class Program { }` ao final de `Program.cs`.

**Casos mínimos**
1. Venda inválida (itens vazios, qty ≤ 0, desconto > subtotal) → 400.
2. Crediário com entrada → `Payment` de entrada criado, `TotalWithInterest` correto, status `Pending`.
3. Recebimento parcial → `remaining` diminui, status `Pending`; quitar o restante → status `Paid`.
4. Recebimento duplicado → 409; mesma `IdempotencyKey` → 200 sem duplicar.
5. Valor negativo/sobrepagamento → 400.
6. Concorrência: duas vendas simultâneas da última unidade → uma 200, uma 409.
7. Excluir produto com item de pedido → 409.
8. Registro público desativado → 403.
9. Token de usuário inativo → 401.

**Comandos**
```bash
dotnet build
dotnet test
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run build
```

**Validação manual:** repetir cenários A–G do relatório após as correções.

---

## 10. Riscos e rollback

| Risco | Mitigação |
|-------|-----------|
| Migration de FK falhar por dados inconsistentes | Validar órfãos antes; backup |
| Histórico de recebimentos zerar | Backfill obrigatório na migration |
| Duplicação de caixa (Payment + PaidAmount) | `Payment` é fonte de verdade; `PaidAmount` é cache derivado |
| Bloqueio de vendedores por RBAC | Confirmar roles antes; garantir admin ativo |
| Parcial quebrar UI | Modal com valor default = saldo restante |
| `dotnet ef` 10 × EF Core 8 | Fixar tool local 8.0.4 |

**Rollback:** `dotnet ef database update <migration-anterior>` restaura schema; o `Down` remove `Payments`/colunas, mas o backfill histórico não é recriado automaticamente — manter backup.

---

## 11. Ordem de execução

1. `pg_dump` de backup.
2. Fixar `dotnet-ef` 8.0.4 local.
3. Migration `FixProductDeleteBehavior`.
4. Migration `AddOrderFinancialsAndPayments` + backfill.
5. `Payment` + `OrderStatusService`.
6. Reescrita de `OrdersController` e `FinancesController`.
7. Validação de DTO + regras de negócio.
8. Auth/RBAC/token.
9. Modal de recebimento parcial no Financeiro.
10. Projeto de testes e verificação.

---

## 12. Fora de escopo (Fase 2/3)

P1: cliente por ID/unique; soft delete de cliente; cancelamento/estorno de venda; histórico completo; limite de crédito; unique de e-mail. P2/P3 permanecem no relatório de auditoria.
