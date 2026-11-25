using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Data;
using ModaLink.Api.Models;
using ModaLink.Tests.Helpers;

namespace ModaLink.Tests.Controllers;

public sealed class FinancesControllerPaymentTests
{
    [Fact]
    public async Task PayInstallment_ParcialRegistraPagamentoESaldoSemQuitarParcela()
    {
        using var env = new FinanceTestContext();
        var installment = await env.SeedInstallmentAsync();

        var result = await env.Controller.PayInstallment(
            installment.Id,
            new PayInstallmentDto { Amount = 40m, Method = "Pix" });

        Assert.IsType<OkObjectResult>(result);
        var saved = await env.Context.Installments
            .Include(i => i.Payments)
            .FirstAsync(i => i.Id == installment.Id);
        Assert.False(saved.IsPaid);
        Assert.Equal(40m, saved.PaidAmount);
        Assert.Single(saved.Payments);
        Assert.Equal(40m, saved.Payments[0].Amount);
        Assert.Equal("Pix", saved.Payments[0].Method);
        Assert.Equal(installment.OrderId, saved.Payments[0].OrderId);
    }

    [Fact]
    public async Task PayInstallment_SaldoRestanteQuitaParcelaEFechaVenda()
    {
        using var env = new FinanceTestContext();
        var installment = await env.SeedInstallmentAsync();

        await env.Controller.PayInstallment(
            installment.Id,
            new PayInstallmentDto { Amount = 40m, Method = "Pix" });
        var result = await env.Controller.PayInstallment(
            installment.Id,
            new PayInstallmentDto { Amount = 60m, Method = "Dinheiro" });

        Assert.IsType<OkObjectResult>(result);
        var saved = await env.Context.Installments
            .Include(i => i.Payments)
            .Include(i => i.Order)
            .FirstAsync(i => i.Id == installment.Id);
        Assert.True(saved.IsPaid);
        Assert.Equal(100m, saved.PaidAmount);
        Assert.Equal("Paid", saved.Order.Status);
        Assert.Equal(2, saved.Payments.Count);

        var receivable = Assert.IsType<OkObjectResult>(await env.Controller.GetReceivable());
        var total = receivable.Value!.GetType().GetProperty("totalReceivable")!.GetValue(receivable.Value);
        var paidThisMonth = receivable.Value.GetType().GetProperty("totalPaidThisMonth")!.GetValue(receivable.Value);
        Assert.Equal(0m, total);
        Assert.Equal(100m, paidThisMonth);
    }

    [Fact]
    public async Task UnpayInstallment_ReverteLancamentosESaldoVoltaAoValorOriginal()
    {
        using var env = new FinanceTestContext();
        var installment = await env.SeedInstallmentAsync();
        await env.Controller.PayInstallment(
            installment.Id,
            new PayInstallmentDto { Amount = 40m, Method = "Pix" });

        var result = await env.Controller.UnpayInstallment(installment.Id);

        Assert.IsType<OkObjectResult>(result);
        var saved = await env.Context.Installments
            .Include(i => i.Payments)
            .FirstAsync(i => i.Id == installment.Id);
        Assert.False(saved.IsPaid);
        Assert.Null(saved.PaidAmount);
        Assert.All(saved.Payments, payment => Assert.NotNull(payment.ReversedAt));

        var receivable = Assert.IsType<OkObjectResult>(await env.Controller.GetReceivable());
        var total = receivable.Value!.GetType().GetProperty("totalReceivable")!.GetValue(receivable.Value);
        var paidThisMonth = receivable.Value.GetType().GetProperty("totalPaidThisMonth")!.GetValue(receivable.Value);
        Assert.Equal(100m, total);
        Assert.Equal(0m, paidThisMonth);
    }

    [Fact]
    public async Task PayInstallment_ValorMaiorQueSaldoRetornaBadRequest()
    {
        using var env = new FinanceTestContext();
        var installment = await env.SeedInstallmentAsync();

        var result = await env.Controller.PayInstallment(
            installment.Id,
            new PayInstallmentDto { Amount = 101m, Method = "Pix" });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(await env.Context.Payments.ToListAsync());
    }

    private sealed class FinanceTestContext : IDisposable
    {
        private readonly SqliteConnection _connection = new("DataSource=:memory:");

        public AppDbContext Context { get; }
        public FinancesController Controller { get; }

        public FinanceTestContext()
        {
            _connection.Open();
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .Options;
            Context = new AppDbContext(options);
            Context.Database.EnsureCreated();
            Context.Users.Add(new User
            {
                Id = FakeUserHelper.DefaultUserId,
                Name = "test-user",
                Email = "finance-test@example.test",
                PasswordHash = "not-used"
            });
            Context.CashRegisters.Add(new CashRegister
            {
                UserId = FakeUserHelper.DefaultUserId,
                OpeningAmount = 100m,
                Status = "Open",
                OpenedAt = DateTime.UtcNow
            });
            Context.SaveChanges();
            Controller = new FinancesController(Context);
            FakeUserHelper.AttachUser(Controller);
        }

        public async Task<Installment> SeedInstallmentAsync()
        {
            var customer = new Customer { Name = "Cliente", Active = true };
            var order = new Order
            {
                Customer = customer,
                PaymentMethod = "Crediário",
                Total = 100m,
                Status = "Pending",
                InstallmentCount = 1
            };
            var installment = new Installment
            {
                Order = order,
                InstallmentNumber = 1,
                Amount = 100m,
                DueDate = DateTime.UtcNow.AddDays(10)
            };
            Context.Installments.Add(installment);
            await Context.SaveChangesAsync();
            return installment;
        }

        public void Dispose()
        {
            Context.Dispose();
            _connection.Dispose();
        }
    }
}
