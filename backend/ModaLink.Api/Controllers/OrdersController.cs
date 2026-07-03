using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(o =>
                o.Customer!.Name.Contains(search) ||
                o.Id.ToString().Contains(search));
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                CustomerName = o.Customer != null ? o.Customer.Name : "",
                o.PaymentMethod,
                o.Total,
                o.Status,
                o.CreatedAt,
                QuantityItems = o.Items.Sum(i => i.Quantity)
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var orders = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .ToListAsync();

        var totalSales = orders.Sum(o => o.Total);
        var totalOrders = orders.Count;
        var totalCustomers = orders.Select(o => o.CustomerId).Distinct().Count();
        var totalProductsCount = await _context.Products.CountAsync();

        var recentOrders = orders
            .OrderByDescending(o => o.CreatedAt)
            .Take(5)
            .Select(o => new
            {
                o.Id,
                CustomerName = o.Customer != null ? o.Customer.Name : "",
                o.Total,
                o.Status,
                o.CreatedAt
            })
            .ToList();

        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { ProductId = i.ProductId, Name = i.Product != null ? i.Product.Title : "" })
            .Select(g => new
            {
                ProductName = g.Key.Name,
                Sales = g.Sum(i => i.Quantity),
                Total = g.Sum(i => i.TotalPrice),
                UnitPrice = g.First().UnitPrice
            })
            .OrderByDescending(p => p.Sales)
            .Take(5)
            .ToList();

        return Ok(new
        {
            totalSales,
            totalOrders,
            totalCustomers,
            totalProducts = totalProductsCount,
            recentOrders,
            topProducts
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .Include(o => o.Installments)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Pedido não encontrado" });

        return Ok(new
        {
            order.Id,
            CustomerName = order.Customer?.Name ?? "",
            CustomerEmail = order.Customer?.Email ?? "",
            CustomerPhone = order.Customer?.Phone ?? "",
            order.PaymentMethod,
            order.Subtotal,
            order.Discount,
            order.Total,
            order.Status,
            order.CreatedAt,
            order.InstallmentCount,
            order.DownPayment,
            order.InterestRate,
            Items = order.Items.Select(i => new
            {
                ProductName = i.Product?.Title ?? "",
                i.Quantity,
                i.UnitPrice,
                TotalPrice = i.TotalPrice,
                subtotal = i.TotalPrice
            }),
            Installments = order.Installments.Select(i => new
            {
                i.Id,
                i.InstallmentNumber,
                i.Amount,
                i.DueDate,
                i.IsPaid,
                i.PaidAt,
                i.PaidAmount
            })
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderDto dto)
    {
        Customer? customer = null;

        if (!string.IsNullOrWhiteSpace(dto.CustomerName))
        {
            customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Name == dto.CustomerName);

            if (customer == null)
            {
                customer = new Customer
                {
                    Name = dto.CustomerName,
                    Email = dto.CustomerEmail,
                    Phone = dto.CustomerPhone,
                    Active = true,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
            }
        }

        var subtotal = dto.Items.Sum(i => i.Quantity * i.UnitPrice);
        var discount = dto.Discount;
        var total = subtotal - discount;

        var order = new Order
        {
            CustomerId = customer?.Id,
            PaymentMethod = dto.PaymentMethod,
            Subtotal = subtotal,
            Discount = discount,
            Total = total,
            Status = dto.PaymentMethod == "Crediário" ? "Pending" : "Completed",
            CreatedAt = DateTime.UtcNow,
            InstallmentCount = dto.InstallmentCount,
            DownPayment = dto.DownPayment,
            InterestRate = dto.InterestRate,
            Items = dto.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.Quantity * i.UnitPrice,
            }).ToList()
        };

        if (dto.PaymentMethod == "Crediário" && (dto.InstallmentCount ?? 0) > 0)
        {
            var amountToFinance = total;
            if (dto.DownPayment.HasValue && dto.DownPayment.Value > 0)
            {
                amountToFinance = total - dto.DownPayment.Value;
            }

            var rate = dto.InterestRate ?? 0;
            var totalWithInterest = amountToFinance * (1 + rate * dto.InstallmentCount!.Value / 100);
            var installmentAmount = Math.Round(totalWithInterest / dto.InstallmentCount!.Value, 2);

            for (int i = 1; i <= dto.InstallmentCount; i++)
            {
                order.Installments.Add(new Installment
                {
                    InstallmentNumber = i,
                    Amount = installmentAmount,
                    DueDate = DateTime.UtcNow.AddMonths(i),
                    IsPaid = false
                });
            }

            // adjust last installment to match total due to rounding
            var sum = order.Installments.Sum(x => x.Amount);
            var diff = totalWithInterest - sum;
            if (diff != 0)
                order.Installments.Last().Amount += diff;
        }

        // validate stock
        foreach (var item in order.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product == null)
                return BadRequest(new { message = $"Produto ID {item.ProductId} nao encontrado" });
            if (product.Stock < item.Quantity)
                return BadRequest(new { message = $"Estoque insuficiente para {product.Title}. Disponivel: {product.Stock}" });
        }

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // decrement stock
        foreach (var item in order.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product != null)
            {
                product.Stock -= item.Quantity;
                product.UpdatedAt = DateTime.UtcNow;
            }
        }
        await _context.SaveChangesAsync();

        return Ok(new { order.Id, order.Total, order.Status });
    }
}
