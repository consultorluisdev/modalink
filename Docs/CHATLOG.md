# ModaLink — Histórico de Desenvolvimento

> Registro completo da construção do sistema PDV + Gestão + Crediário.
> Criado em: 30/05/2026

---

## Stack

- **Backend:** C# .NET 8 (Web API)
- **Frontend:** React + TypeScript + Vite
- **Banco:** PostgreSQL 15
- **Docker:** 4 containers (postgres, api, frontend, pgadmin)
- **Portas:** API 5020, Frontend 5173, pgadmin 5050, Postgres 5434

---

## O que foi construído

### Backend (Modelos)
- `User` — login/register com JWT
- `Customer` — Name, Email, Phone, WhatsApp, Instagram, BirthDate, Notes, Active, CreditLimit, CreatedAt
- `Product` — Title, Description, Price, ImageUrl, Category, Stock, CreatedAt, UpdatedAt
- `Order` — CustomerId (FK), PaymentMethod, Subtotal, Discount, Total, Status, InstallmentCount, DownPayment, InterestRate, CreatedAt
- `OrderItem` — OrderId (FK), ProductId (FK), Quantity, UnitPrice, TotalPrice
- `Installment` — OrderId (FK), InstallmentNumber, Amount, DueDate, IsPaid, PaidAt, PaidAmount

### Backend (Controllers)
- `AuthController` — POST /api/auth/login, POST /api/auth/register
- `ProductsController` — CRUD + [AllowAnonymous] no GET
- `CustomersController` — GET (com search, totalOwed), GET/{id} (histórico completo)
- `OrdersController` — GET, GET/stats, GET/{id}, POST (cria/cliente find-or-create + gera parcelas no crediário)
- `FinancesController` — GET/receivable, GET/receivable/summary, POST installments/{id}/pay, POST installments/{id}/unpay, GET customer/{customerId}

### Frontend (Páginas)
- **Login/Register** — logo indigo (raio em fundo arredondado)
- **Dashboard** — cards clicáveis com dados reais do banco
- **PDV (Nova Venda)** — busca produtos, carrinho, crediário com parcelas/entrada/juros, formas de pagamento com ícones coloridos
- **Produtos** — lista + criar com imagem, categoria, estoque
- **Catálogo** — grid loja com busca
- **Pedidos** — lista de pedidos
- **Clientes** — tabela com saldo devedor, busca, total gasto
- **Financeiro** — 4 cards (total a receber, recebido mês, a vencer, vencidos) + tabela de parcelas com baixar/reabrir
- **IA de Vendas** — chat + cards (mock, sem backend)

### Frontend (Componentes)
- `SideBar` — hamburger mobile, mini-mode desktop, logo raio SVG, sair vermelho rounded-full
- `TopBar` — logo ModaLink + nome

### Infraestrutura
- Docker Compose com 4 containers
- Dockerfile do backend (.NET 8)
- `start.sh` — build frontend + copia wwwroot + docker compose up
- Migrations automáticas na inicialização (`db.Database.Migrate()`)
- SPA fallback em Program.cs

---

## Decisões de Design

| Decisão | Motivo |
|---------|--------|
| React puro (sem Next.js) | Simples, SPA, loja local |
| Sidebar com mini-mode | Reaproveitar em projetos futuros |
| Pix/Dinheiro/Cartão sem gateway | Loja física, pagamento fora do sistema |
| Crediário com juros simples | Mais comum em loja de bairro |
| Logo indigo (raio) | Identidade visual única |
| Cliente find-or-create na venda | Agilidade no PDV |
| `[AllowAnonymous]` no GET products | Catálogo público pro app React Native |
| Migrations automáticas | Zero comando manual em produção |

---

## Fluxo do Crediário

1. PDV → seleciona "Crediário"
2. Escolhe: parcelas (1-12x), entrada (R$), juros (% mês)
3. Sistema calcula: valor financiado → total c/ juros → valor parcela
4. Order salva como "Pending", parcelas geradas na tabela `Installments`
5. `/financeiro` mostra todas as parcelas pendentes
6. Botão "Baixar" marca como pago, "Reabrir" volta a pendente
7. `/clientes` mostra saldo devedor de cada um

---

## Próximos Passos

1. **Relatórios** — mais vendidos, vendas por período, estoque
2. **Configurações** — dados da loja
3. **IA de Vendas** — backend real
4. **README** + git push
5. **App React Native** — catálogo, cliente vê parcelas/histórico/limite
6. **Futuro:** integração Mercado Livre, Shopee, gateway pagamento

---

## Bugs / Melhorias Conhecidas

- IA de Vendas com respostas mockadas (frontend)
- Sidebar tem link para `/relatorios` e `/configuracoes` sem páginas
- Produtos sem estoque aparecem no PDV (pode comprar mesmo sem stock)
