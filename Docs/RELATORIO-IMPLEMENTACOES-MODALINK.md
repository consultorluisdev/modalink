# ModaLink — relatório de implementações e situação operacional

**Atualizado em:** 25/11/2026  
**Objetivo:** registrar as melhorias feitas na loja online e no ERP, as operações comerciais implementadas no código, as validações executadas e o que falta para usar os novos fluxos em produção.

## Resposta direta: já posso usar para vender?

**Ainda não considere os novos fluxos de caixa, crediário corrigido e estorno prontos para vendas reais em produção.** As mudanças descritas neste relatório estão no código local, mas não foram publicadas nesta etapa nem validadas contra uma conta autenticada e o banco de produção. A migração de banco foi criada, mas ainda não foi aplicada no banco hospedado.

O ERP e a loja que já estão publicados podem continuar acessíveis conforme a configuração anterior. Isso não significa que a versão publicada inclua as operações novas descritas abaixo. O fluxo de venda que existia foi testado no código, mas não foi possível confirmar uma venda autenticada em produção.

**Não registre vendas reais contando com a nova tela de caixa até que o backend e o frontend sejam publicados e o banco esteja atualizado.** No código local, o PDV exige um caixa aberto; o backend atual de produção pode ainda não conhecer essa funcionalidade.

## Onde estão hospedados

- **Frontend/Vercel:** https://modalink-frontend.vercel.app
- **API/Render:** https://modalink-api.onrender.com
- A loja pública fica na rota `/loja-online`. O catálogo depende dos produtos cadastrados no ERP.
- A URL de saúde da API é `/health`. Resposta saudável indica que a API consegue conectar ao banco, mas não comprova os fluxos autenticados de venda.
- Os serviços publicados e suas configurações precisam ser conferidos antes de qualquer implantação. Este trabalho não executou deploy.

## Funcionalidades comerciais implementadas no código local

### PDV e vendas

- O PDV cria vendas e associa os pagamentos registrados à sessão de caixa aberta do usuário.
- O caixa é individual por usuário: cada vendedor abre e fecha a própria sessão.
- O PDV impede concluir a venda sem caixa aberto, tanto na experiência da tela quanto na validação do backend.
- No crediário, a entrada tem forma de pagamento própria e o PDV orienta abrir o caixa antes de finalizar.
- A venda mantém o fluxo de baixa de estoque existente.

### Crediário, parcelas e recebimentos

- Recebimentos parciais passam a ser lançamentos no histórico de pagamentos, em vez de somente alterar o estado da parcela.
- O valor pago é acumulado. Uma parcela permanece aberta até que os recebimentos somados atinjam o valor devido.
- O financeiro calcula saldo em aberto e recebimentos usando o histórico de pagamentos.
- A baixa de parcela aceita método e valor do recebimento; os dados podem ser consultados e revertidos de forma auditável.
- O crediário continua limitado a 1–12 parcelas.

### Cancelamento e estorno

- Foi adicionado cancelamento de pedido com motivo e data opcionais.
- O pedido permanece no histórico como cancelado.
- O cancelamento estorna pagamentos ativos e devolve ao estoque os itens da venda dentro de uma transação.
- A operação é exposta pelo backend e pelo detalhe do pedido.

### Comprovante

- O detalhe do pedido permite gerar/imprimir um comprovante simples, com apresentação adequada à impressão térmica.
- O comprovante é **não fiscal**. Emissão de documento fiscal requer integração apropriada, não incluída.

### Caixa

- Nova tela protegida em `/caixa`, incluída na navegação do ERP.
- Abrir caixa com valor inicial, consultar sessão corrente, registrar despesas e fechar com valor contado.
- O resumo mostra entradas por forma de pagamento, dinheiro recebido, despesas e dinheiro esperado.
- Cálculo do dinheiro esperado: **fundo inicial + recebimentos em dinheiro − despesas**.
- O fechamento informa diferença entre o dinheiro contado e o esperado.
- O backend evita duas sessões abertas simultâneas para o mesmo usuário.

## Interface e experiência

### Loja online

Em etapas anteriores, a loja foi redesenhada para celular e desktop com identidade visual roxa, banner, categorias, busca, cards de produtos, favoritos, carrinho e checkout por WhatsApp. A rota pública `/loja-online` foi separada das rotas autenticadas do ERP. A página depende de produtos cadastrados para exibir catálogo.

### ERP

Em etapas anteriores e no trabalho local foram feitos ajustes de identidade visual, navegação e responsividade, incluindo o uso da paleta roxa da loja, aprimoramento do layout compartilhado e do dashboard, além de revisões em telas como produtos, pedidos, PDV, financeiro, clientes, relatórios, configurações e IA de vendas.

O botão “Voltar” foi adicionado ao cabeçalho compartilhado do ERP; quando não há histórico de navegação, retorna ao dashboard.

**Atenção:** algumas melhorias visuais mais recentes ainda estão apenas no worktree local e não foram todas validadas ou publicadas. Elas não devem ser confundidas com o estado atualmente disponível na Vercel.

## Alterações técnicas relevantes

### Backend

- `FinancesController`: recebimentos parciais, histórico, saldos e reversões.
- `OrdersController`: associação de pagamento ao caixa, cancelamento e devolução de estoque.
- `CashRegistersController`: consulta, abertura, despesas e fechamento de caixa.
- `AppDbContext`: novas entidades, relações, índices e precisão monetária.
- Modelos `CashRegister` e `CashExpense`, além de DTOs de caixa e cancelamento.
- Relatórios e dados financeiros ajustados para considerar os pagamentos registrados.
- `AppDbContextFactory`: factory de design-time para permitir a geração e verificação de migrações mesmo quando a aplicação exige conexão ao iniciar.

### Frontend

- `CashRegister.tsx` e `cashRegisterService.ts`: tela e chamadas de caixa.
- PDV (`NovaVenda.tsx`): verificação de caixa e forma de recebimento da entrada do crediário.
- Financeiro (`Financeiro.tsx`): valor e método de recebimento de parcelas.
- Detalhe de pedido (`OrderDetailModal.tsx`): cancelamento e comprovante para impressão.
- Rotas, navegação e título da tela de caixa atualizados.

## Banco de dados e migração

Foi gerada a migração EF Core:

- `backend/ModaLink.Api/Migrations/20261125062118_OperationalSalesFeatures.cs`
- `backend/ModaLink.Api/Migrations/20261125062118_OperationalSalesFeatures.Designer.cs`

A migração inclui:

- `CashRegisters` e `CashExpenses`;
- `Payments.CashRegisterId` e sua relação com caixa;
- `Orders.CancelledAt` e `Orders.CancellationReason`;
- índices e restrições necessários, incluindo uma sessão aberta única por usuário.

A API chama `Database.Migrate()` na inicialização; portanto, o backend implantado tentará aplicar migrações pendentes ao iniciar. Isso **não foi executado contra o banco de produção** neste trabalho. A factory usa `ConnectionStrings__DefaultConnection` ou `DATABASE_URL` quando configuradas; sem conexão, usa uma conexão local de design-time para construir o modelo, não para aplicar a migração.

## Validações executadas

- **83 testes automatizados do backend passaram** (`dotnet test backend/ModaLink.Tests/ModaLink.Tests.csproj`).
- O EF Core confirmou: **“No changes have been made to the model since the last migration.”**
- `git diff --check` passou sem erros de whitespace.
- Nas verificações anteriores desta etapa, ESLint e TypeScript do frontend passaram. A validação não equivale a teste de produção.
- Não foi executada venda autenticada no banco hospedado, nem teste ponta a ponta em produção.
- Não houve deploy do backend nem da Vercel nesta etapa.

## O que falta antes de liberar vendas reais com as novas operações

1. Revisar o diff e separar alterações intencionais de arquivos gerados (`bin/` e `obj/`) e de outras mudanças preexistentes.
2. Confirmar variáveis de ambiente e acesso ao banco do backend hospedado, sem expor credenciais.
3. Publicar o backend com a migração e confirmar nos logs que iniciou e conectou ao banco.
4. Publicar o frontend compatível com o backend novo.
5. Testar com uma conta autorizada: abrir caixa, venda à vista, venda no crediário, recebimento parcial e total, despesa, cancelamento/estorno, reposição de estoque e fechamento.
6. Confirmar comportamento em celular e desktop e verificar os registros financeiros resultantes.
7. Só depois dessa validação anunciar os novos fluxos como disponíveis em produção.

Não foi criada venda de teste em produção. Para testar os fluxos reais, use primeiro ambiente de homologação ou dados de teste autorizados.

## Como operar após publicação e validação

1. Entre no ERP e abra **Caixa**.
2. Informe o fundo inicial do turno e abra a sessão.
3. Registre vendas pelo PDV. Para crediário, informe a entrada e sua forma de recebimento; as parcelas futuras ficam no financeiro.
4. No financeiro, registre o valor efetivamente recebido de cada parcela. Pagamentos parciais mantêm o saldo restante.
5. Registre despesas na sessão correspondente.
6. Para cancelar uma venda, abra o pedido, confira os itens e confirme o cancelamento; o sistema registra o estorno e devolve o estoque.
7. Ao final do turno, confira o dinheiro esperado, conte o caixa e informe o valor contado para fechar.
8. Use o comprovante como recibo simples; ele não substitui documento fiscal.

## Nota sobre o estado do repositório

O worktree contém alterações locais de diferentes etapas, inclusive arquivos não rastreados e artefatos compilados. O relatório descreve o trabalho realizado, mas não afirma que todo o diff atual é parte exclusiva destas operações comerciais. Antes de commit ou deploy, revise cuidadosamente o estado do Git e não inclua arquivos gerados sem necessidade.
