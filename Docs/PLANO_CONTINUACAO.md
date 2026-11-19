# Tarefas — próxima sessão

> Salvo em 17/11/2026. Retomar daqui.
> **Plano detalhado da Fase 1 (P0):** `Docs/PLANO_EXECUCAO_FASE_1.md` (criado em 18/11/2026).

## Estado atual
- Fase 0 concluída e commitada (`e41f68a8`):
  - `using ModaLink.Api.Data;` restaurado em `FinancesController.cs` (build voltou a compilar).
  - P0-03: `PayInstallment` simplificado + `Include(Order)` em `UnpayInstallment`.
  - P0-01 parcial: `ProductsController.Delete` retorna 409 se produto tem vendas.
  - `dotnet build` = 0 erros / 0 avisos.
- Auditorias de referência:
  - `Docs/AUDITORIA_FLUXO_VENDAS_FINANCEIRO.md` (P0-01..P0-07)
  - `Docs/AUDITORIA_MODALINK.md` (P0-1..P0-17)
- **18/11/2026 — schema reconciliado:** o banco já tinha `20261113125223_FixProductDeleteBehavior` e `20261113130537_AddOrderFinancialsAndPayments` aplicadas (build de 13/11). As migrations foram recuperadas por decompilação do DLL do container; modelo/snapshot alinhados (`has-pending-model-changes` limpo). **P0-01 concluído**; schema de `Payment` + campos financeiros pronto — falta a lógica nos controllers.

## Decisões pendentes (com default recomendado)
1. Escopo "finalizar tudo": só P0 do fluxo + regressões frontend (recomendado). Multi-tenancy = épico separado.
2. P0-02 `Unpay`: registrar estorno (recomendado) em vez de apagar histórico.
3. P0-06: preço do item vem do banco (`Product.Price`), não do cliente (recomendado).
4. P0-07: `POST /auth/register` restrito a Administrador (recomendado).
5. P0-05: concorrência via `ExecuteUpdate` condicional `WHERE Stock >= qty` (recomendado).
6. Incluir cancelamento de venda (P1-06, cenário F)? (recomendado: sim, se der tempo)
7. `bin/obj` rastreados: restaurar (feito) ou remover do Git (`git rm -r --cached`)?

## Fase 1 — P0 backend (ordem)
1. **P0-01 (concluído em 18/11)** — migration `FixProductDeleteBehavior` recuperada; FK em `Restrict`; 409 mantido.
2. **P0-02** — `Payment` imutável + idempotência:
   - [x] Schema: model `Payment` (InstallmentId, Amount, Method?, PaidAt, UserId?, IdempotencyKey?, ReversedAt?) + migration + backfill.
   - [ ] `PayInstallment`: transação, insere Payment + atualiza Installment; 409 se já paga.
   - [ ] `UnpayInstallment`: registra estorno (não apaga histórico).
3. **P0-04** — entrada + reconciliação:
   - [x] Schema: `FinancedAmount`, `InterestAmount`, `TotalWithInterest` + backfill (sem `DownPaymentPaidAt`; entrada via `Payment` com `InstallmentId = null`).
   - [ ] Registrar entrada como recebimento e incluir no "recebido no mês".
4. **P0-05** — concorrência de estoque:
   - `ExecuteUpdateAsync` condicional dentro da transação; checar linhas afetadas; sem N+1.
5. **P0-06** — validação:
   - DataAnnotations em `CreateOrderDto`/`CreateOrderItemDto`.
   - Regras: itens não vazios, qty>0, preço>0, `0<=Discount<=Subtotal`, `InstallmentCount>0` crediário, `0<=DownPayment<=Total`, juros>=0, PaymentMethod whitelist.
6. **P0-07** — segurança:
   - `[Authorize(Roles="Administrador")]` no register e escritas de produto/cliente/financeiro.
   - Rate limiting auth (`AddRateLimiter`/`UseRateLimiter`).
   - Validar `IsActive` por request (`OnTokenValidated`); usar `ExpirationHours` (hoje 7 dias fixo).

## Fase 2 — P1 rápidos (se sobrar)
- Índices/UNIQUE: `Orders.CreatedAt`, `Installments.DueDate/IsPaid`, `Orders.Status`, `Customers.Email`, `Users.Email`.
- Delete de cliente com histórico → 409/soft delete.
- Upload de imagem com MIME/tamanho.
- `GET /orders/stats` e `/finances/receivable`: agregar no banco + paginação.
- Constraint singleton `StoreSetting`.

## Fase 3 — Frontend
1. `SideBar.tsx:32` → `/catalogo` (regressão R1).
2. `Reports/index.tsx:69,99` → retry/refresh real.
3. `services/api.ts` → DEV usar `/api` (proxy Vite).
4. Dashboard "Vendas (mês)" com filtro do mês (precisa endpoint).
5. `orders/Orders.tsx` → debounce na busca.
6. RBAC na UI (esconder Configurações p/ não-admin).
7. Detalhe do pedido com parcelas; limpar `App.tsx`/TopBar; cores do `Badge`.

## Validação final
- `dotnet build` (0/0) e migrations aplicadas.
- Cenários A–G: A à vista, B crediário, C recebimento parcial, D quitação→Paid, E duplicada→409, F cancelamento, G concorrência (só 1 venda).
- Frontend: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
