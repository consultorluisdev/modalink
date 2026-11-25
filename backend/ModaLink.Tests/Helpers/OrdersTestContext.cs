using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Data;
using ModaLink.Api.Models;

namespace ModaLink.Tests.Helpers;

public sealed class OrdersTestContext : IDisposable
{
  private readonly SqliteConnection _connection;
  public AppDbContext Context { get; }
  public OrdersController Controller { get; }

  public OrdersTestContext(int userId = FakeUserHelper.DefaultUserId, string role = FakeUserHelper.DefaultRole)
  {
    _connection = new SqliteConnection("DataSource=:memory:");
    _connection.Open();

    var options = new DbContextOptionsBuilder<AppDbContext>()
        .UseSqlite(_connection)
        .Options;

    Context = new AppDbContext(options);
    Context.Database.EnsureCreated();
    Context.Users.Add(new User
    {
      Id = userId,
      Name = "test-user",
      Email = $"user-{userId}@example.test",
      PasswordHash = "not-used",
      Role = role
    });
    Context.CashRegisters.Add(new CashRegister
    {
      UserId = userId,
      OpeningAmount = 100m,
      Status = "Open",
      OpenedAt = DateTime.UtcNow
    });
    Context.SaveChanges();

    Controller = new OrdersController(Context);
    FakeUserHelper.AttachUser(Controller, userId, role);
  }

  public async Task<Product> SeedProductAsync(
      string title = "Produto",
      decimal price = 100m,
      int stock = 10,
      string? category = null)
  {
    var product = new Product
    {
      Title = title,
      Description = "desc",
      Price = price,
      Stock = stock,
      Category = category,
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow
    };
    Context.Products.Add(product);
    await Context.SaveChangesAsync();
    return product;
  }

  public void Dispose()
  {
    Context.Dispose();
    _connection.Dispose();
  }
}
