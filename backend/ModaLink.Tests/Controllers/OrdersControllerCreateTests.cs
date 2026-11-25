using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Common;
using ModaLink.Api.Models;
using ModaLink.Tests.Helpers;
using Xunit;

namespace ModaLink.Tests.Controllers;

public class OrdersControllerCreateTests
{
  // ---------- Helper ----------

  private static CreateOrderDto Dto(
      int productId,
      int quantity = 1,
      string paymentMethod = "Pix",
      decimal discount = 0m,
      int? installmentCount = null,
      decimal? downPayment = null,
      decimal? interestRate = null,
      string customerName = "Maria")
  {
    return new CreateOrderDto
    {
      CustomerName = customerName,
      PaymentMethod = paymentMethod,
      Discount = discount,
      InstallmentCount = installmentCount,
      DownPayment = downPayment,
      DownPaymentMethod = downPayment > 0 ? "Pix" : null,
      InterestRate = interestRate,
      Items = new List<CreateOrderItemDto>
            {
                new()
                {
                    ProductId = productId,
                    Quantity = quantity,
                    UnitPrice = 999m   // deve ser ignorado
                }
            }
    };
  }

  // ---------- Cenário A — venda à vista ----------

  [Fact]
  public async Task Create_VendaAVista_CriaPaymentComInstallmentIdNulo()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync(price: 200m, stock: 5);

    var dto = Dto(product.Id, quantity: 1, paymentMethod: "Pix");

    var result = await env.Controller.Create(dto, CancellationToken.None);

    var ok = Assert.IsType<OkObjectResult>(result);
    var order = await env.Context.Orders
        .Include(o => o.Items)
        .Include(o => o.Payments)
        .Include(o => o.Installments)
        .FirstAsync();

    Assert.Equal(OrderStatuses.Paid, order.Status);
    Assert.Equal(200m, order.Total);
    Assert.Single(order.Payments);
    var payment = order.Payments[0];
    Assert.Equal(200m, payment.Amount);
    Assert.Null(payment.InstallmentId);
    Assert.Equal("Pix", payment.Method);
    Assert.Null(payment.ReversedAt);
    Assert.Empty(order.Installments);

    // Preço do banco foi usado, não o UnitPrice do DTO
    Assert.Equal(200m, order.Items[0].UnitPrice);
    Assert.Equal(200m, order.Items[0].TotalPrice);
  }

  [Fact]
  public async Task Create_VendaAVista_BaixaEstoque()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync(price: 50m, stock: 10);

    await env.Controller.Create(Dto(product.Id, quantity: 3), CancellationToken.None);

    var reloaded = await env.Context.Products.AsNoTracking().FirstAsync(p => p.Id == product.Id);
    Assert.Equal(7, reloaded.Stock);
  }

  [Fact]
  public async Task Cancel_DevolveEstoque_EstornaPagamentosEEvitaDuplicidade()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync(price: 50m, stock: 10);
    await env.Controller.Create(Dto(product.Id, quantity: 2), CancellationToken.None);
    var order = await env.Context.Orders.FirstAsync();

    var result = await env.Controller.Cancel(
        order.Id,
        new CancelOrderDto { Reason = "Solicitação do cliente" },
        CancellationToken.None);

    Assert.IsType<OkObjectResult>(result);
    var cancelled = await env.Context.Orders
        .Include(o => o.Payments)
        .FirstAsync(o => o.Id == order.Id);
    Assert.Equal(OrderStatuses.Cancelled, cancelled.Status);
    Assert.Equal("Solicitação do cliente", cancelled.CancellationReason);
    Assert.Single(cancelled.Payments);
    Assert.NotNull(cancelled.Payments[0].ReversedAt);
    var reloaded = await env.Context.Products.AsNoTracking().FirstAsync(p => p.Id == product.Id);
    Assert.Equal(10, reloaded.Stock);

    var duplicate = await env.Controller.Cancel(order.Id, null, CancellationToken.None);
    Assert.IsType<ConflictObjectResult>(duplicate);
  }

  // ---------- Cenário B — crediário sem entrada ----------

  [Fact]
  public async Task Create_CrediarioSemEntrada_CriaParcelasECamposFinanceiros()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync(price: 500m, stock: 5);

    var dto = Dto(
        product.Id,
        quantity: 1,
        paymentMethod: "Crediário",
        installmentCount: 5);

    var result = await env.Controller.Create(dto, CancellationToken.None);

    var ok = Assert.IsType<OkObjectResult>(result);
    var order = await env.Context.Orders
        .Include(o => o.Installments)
        .Include(o => o.Payments)
        .FirstAsync();

    Assert.Equal(OrderStatuses.Pending, order.Status);
    Assert.Equal(500m, order.Total);
    Assert.Equal(500m, order.FinancedAmount);
    Assert.Equal(0m, order.InterestAmount);
    Assert.Equal(500m, order.TotalWithInterest);
    Assert.Equal(5, order.Installments.Count);
    Assert.Equal(5, order.InstallmentCount);
    Assert.Null(order.DownPayment);
    Assert.Empty(order.Payments);
    Assert.Equal(500m, order.Installments.Sum(i => i.Amount));
    Assert.All(order.Installments, i => Assert.False(i.IsPaid));
  }

  // ---------- Cenário B2 — crediário com entrada ----------

  [Fact]
  public async Task Create_CrediarioComEntrada_CriaPaymentDeEntrada()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync(price: 100m, stock: 5);

    var dto = Dto(
        product.Id,
        quantity: 1,
        paymentMethod: "Crediário",
        installmentCount: 4,
        downPayment: 15m);

    await env.Controller.Create(dto, CancellationToken.None);

    var order = await env.Context.Orders
        .Include(o => o.Payments)
        .Include(o => o.Installments)
        .FirstAsync();

    Assert.Equal(OrderStatuses.Pending, order.Status);
    Assert.Equal(100m, order.Total);
    Assert.Equal(85m, order.FinancedAmount);
    Assert.Single(order.Payments);
    var entry = order.Payments[0];
    Assert.Equal(15m, entry.Amount);
    Assert.Null(entry.InstallmentId);
    Assert.Equal("Pix", entry.Method);
    Assert.Equal(4, order.Installments.Count);
  }

  // ---------- Cenário H — validações ----------

  [Fact]
  public async Task Create_FormaDePagamentoInvalida_Retorna400()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync();

    var dto = Dto(product.Id, paymentMethod: "Boleto");

    var result = await env.Controller.Create(dto, CancellationToken.None);

    var bad = Assert.IsType<BadRequestObjectResult>(result);
    Assert.Contains("Forma de pagamento inválida", bad.Value!.ToString());
    Assert.Empty(env.Context.Orders);
    var reloaded = await env.Context.Products.AsNoTracking().FirstAsync(p => p.Id == product.Id);
    Assert.Equal(product.Stock, reloaded.Stock);   // nada de estoque baixado
  }

  [Fact]
  public async Task Create_CrediarioSemParcelas_Retorna400()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync();

    var dto = Dto(product.Id, paymentMethod: "Crediário", installmentCount: 0);

    var result = await env.Controller.Create(dto, CancellationToken.None);

    Assert.IsType<BadRequestObjectResult>(result);
    Assert.Empty(env.Context.Orders);
  }

  [Fact]
  public async Task Create_EntradaIgualAoTotal_Retorna400()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync(price: 100m);

    var dto = Dto(
        product.Id,
        paymentMethod: "Crediário",
        installmentCount: 2,
        downPayment: 100m);

    var result = await env.Controller.Create(dto, CancellationToken.None);

    Assert.IsType<BadRequestObjectResult>(result);
    Assert.Empty(env.Context.Orders);
  }

  [Fact]
  public async Task Create_ParcelamentoEmVendaAVista_Retorna400()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync();

    var dto = Dto(product.Id, paymentMethod: "Pix", installmentCount: 3);

    var result = await env.Controller.Create(dto, CancellationToken.None);

    Assert.IsType<BadRequestObjectResult>(result);
    Assert.Empty(env.Context.Orders);
  }

  [Fact]
  public async Task Create_ProdutoInexistente_Retorna400()
  {
    using var env = new OrdersTestContext();

    var dto = Dto(productId: 9999);

    var result = await env.Controller.Create(dto, CancellationToken.None);

    var bad = Assert.IsType<BadRequestObjectResult>(result);
    Assert.Contains("9999", bad.Value!.ToString());
    Assert.Empty(env.Context.Orders);
  }

  [Fact]
  public async Task Create_ProdutoDuplicado_Retorna400()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync();

    var dto = new CreateOrderDto
    {
      CustomerName = "Maria",
      PaymentMethod = "Pix",
      Discount = 0m,
      Items = new List<CreateOrderItemDto>
            {
                new() { ProductId = product.Id, Quantity = 1 },
                new() { ProductId = product.Id, Quantity = 1 }
            }
    };

    var result = await env.Controller.Create(dto, CancellationToken.None);

    Assert.IsType<BadRequestObjectResult>(result);
    Assert.Empty(env.Context.Orders);
  }

  [Fact]
  public async Task Create_DescontoMaiorQueSubtotal_Retorna400()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync(price: 100m);

    var dto = Dto(product.Id, discount: 500m);

    var result = await env.Controller.Create(dto, CancellationToken.None);

    Assert.IsType<BadRequestObjectResult>(result);
    Assert.Empty(env.Context.Orders);
  }

  [Fact]
  public async Task Create_ClienteVazio_Retorna400()
  {
    using var env = new OrdersTestContext();
    var product = await env.SeedProductAsync();

    var dto = Dto(product.Id, customerName: "   ");

    var result = await env.Controller.Create(dto, CancellationToken.None);

    Assert.IsType<BadRequestObjectResult>(result);
    Assert.Empty(env.Context.Orders);
  }
}
