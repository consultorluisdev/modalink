using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("sales")]
    public async Task<IActionResult> GetSales([FromQuery] string? period)
    {
        var now = DateTime.UtcNow;
        var fromDate = period?.ToLower() switch
        {
            "week" => now.AddDays(-7),
            "month" => now.AddMonths(-1),
            "quarter" => now.AddMonths(-3),
            "year" => now.AddYears(-1),
            _ => now.AddMonths(-1)
        };

        var orders = await _context.Orders
            .Where(o => o.CreatedAt >= fromDate)
            .ToListAsync();

        var totalVendido = orders.Sum(o => o.Total);
        var vendasPorPeriodo = orders
            .GroupBy(o => o.CreatedAt.ToString("yyyy-MM"))
            .Select(g => new
            {
                mes = g.Key,
                valor = g.Sum(o => o.Total)
            })
            .OrderBy(x => x.mes)
            .ToList();

        var topProducts = await _context.OrderItems
            .Where(i => i.Order!.CreatedAt >= fromDate)
            .GroupBy(i => new { i.ProductId, Name = i.Product!.Title })
            .Select(g => new
            {
                nome = g.Key.Name,
                quantidade = g.Sum(i => i.Quantity),
                valor = g.Sum(i => i.TotalPrice)
            })
            .OrderByDescending(p => p.quantidade)
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            totalVendido,
            vendasPorPeriodo,
            produtosMaisVendidos = topProducts
        });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var salesThisMonth = await _context.Orders
            .Where(o => o.CreatedAt >= monthStart)
            .SumAsync(o => o.Total);

        var ordersThisMonth = await _context.Orders
            .Where(o => o.CreatedAt >= monthStart)
            .CountAsync();

        var totalProducts = await _context.Products.CountAsync();
        var totalCustomers = await _context.Customers.CountAsync();
        var pendingInstallments = await _context.Installments
            .Where(i => !i.IsPaid)
            .CountAsync();

        return Ok(new
        {
            salesThisMonth,
            ordersThisMonth,
            totalProducts,
            totalCustomers,
            pendingInstallments
        });
    }
}
