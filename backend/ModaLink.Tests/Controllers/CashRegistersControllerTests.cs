using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Data;
using ModaLink.Api.Models;
using ModaLink.Tests.Helpers;

namespace ModaLink.Tests.Controllers;

public sealed class CashRegistersControllerTests
{
    [Fact]
    public async Task CashRegister_AberturaDespesaVendaEFechamentoCalculamDiferenca()
    {
        using var env = new CashRegisterTestContext();
        var openResult = await env.Controller.Open(new OpenCashRegisterDto { OpeningAmount = 100m }, CancellationToken.None);
        Assert.IsType<OkObjectResult>(openResult);

        var register = await env.Context.CashRegisters.SingleAsync();
        env.Context.Payments.Add(new Payment
        {
            Order = new Order { PaymentMethod = "Dinheiro", Total = 80m, Status = "Paid" },
            CashRegisterId = register.Id,
            Amount = 80m,
            Method = "Dinheiro",
            PaidAt = DateTime.UtcNow
        });
        await env.Context.SaveChangesAsync();

        var expenseResult = await env.Controller.AddExpense(
            new CreateCashExpenseDto { Amount = 20m, Description = "Embalagens" },
            CancellationToken.None);
        Assert.IsType<OkObjectResult>(expenseResult);

        var current = Assert.IsType<OkObjectResult>(await env.Controller.GetCurrent(CancellationToken.None));
        var expectedCash = GetProperty<decimal>(current.Value!, "ExpectedCash");
        Assert.Equal(160m, expectedCash);

        var closeResult = Assert.IsType<OkObjectResult>(
            await env.Controller.Close(new CloseCashRegisterDto { ClosingAmount = 155m }, CancellationToken.None));
        Assert.Equal(-5m, GetProperty<decimal>(closeResult.Value!, "Difference"));
        var savedRegister = await env.Context.CashRegisters.SingleAsync();
        Assert.Equal("Closed", savedRegister.Status);
        Assert.Equal(155m, savedRegister.ClosingAmount);
    }

    [Fact]
    public async Task Open_DoisCaixasAbertosParaMesmoUsuario_RetornaConflict()
    {
        using var env = new CashRegisterTestContext();
        await env.Controller.Open(new OpenCashRegisterDto { OpeningAmount = 0m }, CancellationToken.None);

        var result = await env.Controller.Open(new OpenCashRegisterDto { OpeningAmount = 10m }, CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Single(await env.Context.CashRegisters.ToListAsync());
    }

    private static T GetProperty<T>(object source, string name)
        => (T)source.GetType().GetProperty(name)!.GetValue(source)!;

    private sealed class CashRegisterTestContext : IDisposable
    {
        private readonly SqliteConnection _connection = new("DataSource=:memory:");

        public AppDbContext Context { get; }
        public CashRegistersController Controller { get; }

        public CashRegisterTestContext()
        {
            _connection.Open();
            var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
            Context = new AppDbContext(options);
            Context.Database.EnsureCreated();
            Context.Users.Add(new User
            {
                Id = FakeUserHelper.DefaultUserId,
                Name = "test-user",
                Email = "cash-test@example.test",
                PasswordHash = "not-used"
            });
            Context.SaveChanges();
            Controller = new CashRegistersController(Context);
            Controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = FakeUserHelper.CreatePrincipal()
                }
            };
        }

        public void Dispose()
        {
            Context.Dispose();
            _connection.Dispose();
        }
    }
}
