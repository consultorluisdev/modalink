using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Common;
using ModaLink.Api.Data;
using ModaLink.Api.Models;
using ModaLink.Api.Services;
using Xunit;

namespace ModaLink.Tests.Services;

public class OrderStatusServiceTests
{
  private static AppDbContext CreateContext()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
        .Options;
    return new AppDbContext(options);
  }

  private static Order NewOrder(string status = OrderStatuses.Pending)
      => new Order
      {
        PaymentMethod = "Pix",
        Subtotal = 0m,
        Discount = 0m,
        Total = 0m,
        Status = status,
        CreatedAt = DateTime.UtcNow
      };

  private static Installment NewInstallment(int number, bool isPaid)
      => new Installment
      {
        InstallmentNumber = number,
        Amount = 100m,
        DueDate = DateTime.UtcNow.AddMonths(number),
        IsPaid = isPaid
      };

  [Fact]
  public async Task RecalculateAsync_PedidoInexistente_NaoDeveLancar()
  {
    using var ctx = CreateContext();
    var svc = new OrderStatusService(ctx);

    var ex = await Record.ExceptionAsync(() => svc.RecalculateAsync(999));

    Assert.Null(ex);
  }

  [Fact]
  public async Task RecalculateAsync_PedidoCancelado_NaoDeveMudar()
  {
    using var ctx = CreateContext();
    var order = NewOrder(OrderStatuses.Cancelled);
    order.Installments.Add(NewInstallment(1, false));
    ctx.Orders.Add(order);
    await ctx.SaveChangesAsync();

    var svc = new OrderStatusService(ctx);
    await svc.RecalculateAsync(order.Id);
    await ctx.SaveChangesAsync();

    var reloaded = await ctx.Orders.AsNoTracking().FirstAsync(o => o.Id == order.Id);
    Assert.Equal(OrderStatuses.Cancelled, reloaded.Status);
  }

  [Fact]
  public async Task RecalculateAsync_PedidoAVista_SemParcelas_DeveFicarPaid()
  {
    using var ctx = CreateContext();
    var order = NewOrder(OrderStatuses.Pending);
    ctx.Orders.Add(order);
    await ctx.SaveChangesAsync();

    var svc = new OrderStatusService(ctx);
    await svc.RecalculateAsync(order.Id);
    await ctx.SaveChangesAsync();

    var reloaded = await ctx.Orders.AsNoTracking().FirstAsync(o => o.Id == order.Id);
    Assert.Equal(OrderStatuses.Paid, reloaded.Status);
  }

  [Fact]
  public async Task RecalculateAsync_CrediarioComParcelaEmAberto_DeveFicarPending()
  {
    using var ctx = CreateContext();
    var order = NewOrder(OrderStatuses.Pending);
    order.Installments.Add(NewInstallment(1, true));
    order.Installments.Add(NewInstallment(2, false));
    ctx.Orders.Add(order);
    await ctx.SaveChangesAsync();

    var svc = new OrderStatusService(ctx);
    await svc.RecalculateAsync(order.Id);
    await ctx.SaveChangesAsync();

    var reloaded = await ctx.Orders.AsNoTracking().FirstAsync(o => o.Id == order.Id);
    Assert.Equal(OrderStatuses.Pending, reloaded.Status);
  }

  [Fact]
  public async Task RecalculateAsync_CrediarioTodasPagas_DeveFicarPaid()
  {
    using var ctx = CreateContext();
    var order = NewOrder(OrderStatuses.Pending);
    order.Installments.Add(NewInstallment(1, true));
    order.Installments.Add(NewInstallment(2, true));
    order.Installments.Add(NewInstallment(3, true));
    ctx.Orders.Add(order);
    await ctx.SaveChangesAsync();

    var svc = new OrderStatusService(ctx);
    await svc.RecalculateAsync(order.Id);
    await ctx.SaveChangesAsync();

    var reloaded = await ctx.Orders.AsNoTracking().FirstAsync(o => o.Id == order.Id);
    Assert.Equal(OrderStatuses.Paid, reloaded.Status);
  }
}
