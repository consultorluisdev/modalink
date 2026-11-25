using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;

namespace ModaLink.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Installment> Installments { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<CashRegister> CashRegisters { get; set; }
    public DbSet<CashExpense> CashExpenses { get; set; }
    public DbSet<MusicConnection> MusicConnections { get; set; }
    public DbSet<StoreSetting> StoreSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(p => p.Price).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.Property(o => o.Subtotal).HasPrecision(18, 2);
            entity.Property(o => o.Discount).HasPrecision(18, 2);
            entity.Property(o => o.Total).HasPrecision(18, 2);
            entity.Property(o => o.FinancedAmount).HasPrecision(18, 2);
            entity.Property(o => o.InterestAmount).HasPrecision(18, 2);
            entity.Property(o => o.TotalWithInterest).HasPrecision(18, 2);
            entity.HasOne(o => o.Customer)
                .WithMany(c => c.Orders)
                .HasForeignKey(o => o.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.Property(i => i.UnitPrice).HasPrecision(18, 2);
            entity.Property(i => i.TotalPrice).HasPrecision(18, 2);
            entity.HasOne(i => i.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(i => i.Product)
                .WithMany()
                .HasForeignKey(i => i.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StoreSetting>(entity =>
        {
            entity.HasIndex(s => s.Id);
        });

        modelBuilder.Entity<Installment>(entity =>
        {
            entity.Property(i => i.Amount).HasPrecision(18, 2);
            entity.Property(i => i.PaidAmount).HasPrecision(18, 2);
            entity.HasOne(i => i.Order)
                .WithMany(o => o.Installments)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(p => p.Amount).HasPrecision(18, 2);
            entity.HasOne(p => p.Order)
                .WithMany(o => o.Payments)
                .HasForeignKey(p => p.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(p => p.Installment)
                .WithMany(i => i.Payments)
                .HasForeignKey(p => p.InstallmentId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(p => p.CashRegister)
                .WithMany()
                .HasForeignKey(p => p.CashRegisterId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(p => p.IdempotencyKey)
                .IsUnique()
                .HasFilter("\"IdempotencyKey\" IS NOT NULL");
            entity.HasIndex(p => p.PaidAt);
        });

        modelBuilder.Entity<CashRegister>(entity =>
        {
            entity.Property(register => register.OpeningAmount).HasPrecision(18, 2);
            entity.Property(register => register.ClosingAmount).HasPrecision(18, 2);
            entity.HasOne(register => register.User)
                .WithMany()
                .HasForeignKey(register => register.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(register => new { register.UserId, register.Status })
                .IsUnique()
                .HasFilter("\"Status\" = 'Open'");
        });

        modelBuilder.Entity<CashExpense>(entity =>
        {
            entity.Property(expense => expense.Amount).HasPrecision(18, 2);
            entity.Property(expense => expense.Description).HasMaxLength(300);
            entity.HasOne(expense => expense.CashRegister)
                .WithMany(register => register.Expenses)
                .HasForeignKey(expense => expense.CashRegisterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MusicConnection>(entity =>
        {
            entity.Property(connection => connection.Provider).HasMaxLength(20);
            entity.Property(connection => connection.ProtectedAccessToken).HasMaxLength(4096);
            entity.Property(connection => connection.ProtectedRefreshToken).HasMaxLength(4096);
            entity.Property(connection => connection.ExternalUserId).HasMaxLength(200);
            entity.HasOne(connection => connection.User)
                .WithMany()
                .HasForeignKey(connection => connection.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(connection => new { connection.UserId, connection.Provider }).IsUnique();
        });
    }
}
