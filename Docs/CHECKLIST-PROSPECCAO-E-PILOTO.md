# ModaLink — prospecção e preparação para clientes

**Atualizado em:** 25/11/2026  
**Objetivo:** orientar a prospecção inicial e organizar o que falta validar antes de oferecer o ModaLink para uso comercial em produção.

## Posso começar a prospectar?

**Sim.** Já é possível conversar com lojistas, entender as necessidades deles, apresentar o conceito e procurar interessados para um piloto acompanhado.

Por enquanto, não prometa que todos os recursos estão prontos para uso geral nem que a operação está validada em produção. As melhorias recentes de caixa, crediário e cancelamento ainda não foram publicadas nem testadas com o banco de produção. Os testes automatizados do backend passaram, mas isso não substitui uma validação real, autenticada e ponta a ponta.

## Prioridades antes de oferecer acesso para lojas

### 1. Garantir isolamento dos dados por loja

Antes de cadastrar mais de uma empresa, confirmar que produtos, vendas, clientes, usuários, relatórios e configurações de uma loja não podem ser acessados por outra.

- Verificar como cada registro é associado à loja/empresa.
- Validar autorização em todos os endpoints, não apenas esconder informações na interface.
- Criar testes com duas lojas e usuários diferentes, confirmando que uma loja não consegue consultar ou alterar dados da outra.
- Não usar dados reais de clientes em testes de isolamento.

**Bloqueador para múltiplas lojas:** não considerar o sistema multiempresa pronto até essa validação ser concluída.

### 2. Publicar e validar as operações principais

As alterações locais de caixa, recebimentos parciais e cancelamento precisam ser revisadas, publicadas e testadas com o esquema atualizado antes de depender delas em produção.

Fluxos que precisam de validação:

- Cadastro e edição de produtos, incluindo estoque.
- Venda à vista e baixa correta do estoque.
- Venda no crediário e recebimento da entrada.
- Recebimento parcial e total de parcelas, com saldo e histórico corretos.
- Abertura do caixa, registro de despesas e fechamento com conferência.
- Cancelamento de venda, estorno e reposição de estoque.
- Acesso à loja online pelo celular e compra/contato pelo fluxo disponibilizado.

As validações devem começar em homologação ou com dados de teste autorizados. Não criar vendas artificiais no banco de produção sem autorização.

### 3. Preparar a operação

- Confirmar hospedagem do frontend, backend e banco, além das variáveis de ambiente.
- Configurar backups e testar como restaurá-los.
- Ter monitoramento e um procedimento para identificar indisponibilidade.
- Criar contas individuais para cada pessoa; não compartilhar senhas.
- Definir papéis e permissões. Administrador deve ser concedido somente a quem precisa gerenciar a loja e as configurações.
- Criar o acesso da administradora da loja quando estiverem prontos para configurar usuários. Esse cadastro ainda precisa ser feito.

### 4. Informar corretamente o que o sistema faz

- O comprovante de venda implementado é **não fiscal**.
- Emissão de nota ou outro documento fiscal depende de integração fiscal própria e não deve ser anunciada como disponível sem implementação e validação.
- Explicar quais funções estão disponíveis na versão publicada e quais ainda estão em desenvolvimento.
- Não prometer integrações, automações, disponibilidade ou suporte que ainda não tenham sido testados e definidos.

### 5. Preparar a oferta comercial

Antes de cobrar ou ampliar a oferta, definir:

- Perfil de loja para o qual o sistema é indicado.
- Preço, período de teste e forma de cobrança.
- O que está incluído no plano e eventuais limites.
- Como será o cadastro, configuração inicial e migração de dados.
- Como o lojista recebe ajuda e reporta problemas.
- Termos de uso e política de privacidade adequados ao serviço e aos dados tratados.

### 6. Fazer um piloto acompanhado

Começar com poucas lojas interessadas, com escopo e expectativas claros:

1. Entender como a loja trabalha hoje e quais problemas quer resolver.
2. Configurar a conta e os produtos junto com o responsável.
3. Acompanhar vendas reais somente depois de validar o ambiente e os fluxos necessários.
4. Registrar dúvidas, falhas e solicitações sem inserir dados desnecessários.
5. Corrigir problemas prioritários e verificar novamente antes de aumentar o número de lojas.

## Plano sugerido

| Fase | Ação | Critério para avançar |
|---|---|---|
| 1. Descoberta | Conversar com lojistas e identificar necessidades e interesse | Perfil e problemas prioritários compreendidos |
| 2. Segurança e dados | Confirmar isolamento e permissões por loja | Testes entre lojas passam sem acesso cruzado |
| 3. Preparação técnica | Revisar alterações, publicar backend/frontend e atualizar o banco | Deploy confirmado e aplicação saudável |
| 4. Validação | Testar os fluxos de venda, financeiro, caixa e loja | Fluxos críticos verificados em ambiente controlado |
| 5. Piloto | Acompanhar poucas lojas com escopo limitado | Uso estável e problemas prioritários tratados |
| 6. Oferta | Definir planos, preço, suporte e documentação | Operação e expectativas comerciais definidas |

## Situação conhecida nesta data

- O frontend está hospedado na Vercel e a API foi preparada para hospedagem no Render em etapas anteriores.
- A migração `OperationalSalesFeatures` foi gerada localmente, mas não foi aplicada ao banco de produção.
- O código local contém melhorias de caixa, crediário e cancelamento ainda não publicadas nesta etapa.
- Os 83 testes automatizados do backend passaram.
- Não foi confirmada uma venda autenticada contra o ambiente de produção.
- O estado de isolamento multiempresa ainda precisa ser confirmado antes de oferecer acesso a várias lojas.
- O acesso de administrador da dona da loja não foi criado neste trabalho.

## Regra prática

**Prospectar e validar interesse: sim.**  
**Convidar para conhecer uma demonstração: sim, deixando claro o estado atual.**  
**Prometer prontidão geral, fiscal ou multiempresa: não, até os itens de validação acima serem concluídos.**

