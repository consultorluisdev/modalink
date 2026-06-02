using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = _context.Customers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c =>
                c.Name.Contains(search) ||
                c.Email!.Contains(search) ||
                c.Phone!.Contains(search));
        }

        var customers = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Email,
                c.Phone,
                c.WhatsApp,
                c.Instagram,
                c.Active,
                c.CreditLimit,
                c.CreatedAt,
                TotalOrders = c.Orders.Count,
                TotalSpent = c.Orders.Sum(o => o.Total),
                TotalOwed = c.Orders
                    .SelectMany(o => o.Installments)
                    .Where(i => !i.IsPaid)
                    .Sum(i => i.Amount)
            })
            .ToListAsync();

        return Ok(customers);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var customer = await _context.Customers
            .Include(c => c.Orders)
            .ThenInclude(o => o.Items)
            .ThenInclude(i => i.Product)
            .Include(c => c.Orders)
            .ThenInclude(o => o.Installments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (customer == null)
            return NotFound(new { message = "Cliente não encontrado" });

        var totalOwed = customer.Orders
            .SelectMany(o => o.Installments)
            .Where(i => !i.IsPaid)
            .Sum(i => i.Amount);

        var totalSpent = customer.Orders.Sum(o => o.Total);

        return Ok(new
        {
            customer.Id,
            customer.Name,
            customer.Email,
            customer.Phone,
            customer.WhatsApp,
            customer.Instagram,
            customer.BirthDate,
            customer.Notes,
            customer.Active,
            customer.CreditLimit,
            customer.CreatedAt,
            totalOwed,
            totalSpent,
            totalOrders = customer.Orders.Count,
            orders = customer.Orders.OrderByDescending(o => o.CreatedAt).Select(o => new
            {
                o.Id,
                o.PaymentMethod,
                o.Subtotal,
                o.Discount,
                o.Total,
                o.Status,
                o.CreatedAt,
                o.InstallmentCount,
                Items = o.Items.Select(i => new
                {
                    ProductName = i.Product?.Title ?? "",
                    i.Quantity,
                    i.UnitPrice,
                    i.TotalPrice
                }),
                Installments = o.Installments.Select(i => new
                {
                    i.Id,
                    i.InstallmentNumber,
                    i.Amount,
                    i.DueDate,
                    i.IsPaid,
                    i.PaidAt,
                    i.PaidAmount
                })
            })
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateCustomerDto dto)
    {
        var customer = new Customer
        {
            Name = dto.Name,
            Email = dto.Email,
            Phone = dto.Phone,
            WhatsApp = dto.WhatsApp,
            Instagram = dto.Instagram,
            BirthDate = dto.BirthDate,
            Notes = dto.Notes,
            CreditLimit = dto.CreditLimit,
            Active = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return Ok(new { customer.Id, customer.Name });
    }
}

public class CreateCustomerDto
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? WhatsApp { get; set; }
    public string? Instagram { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Notes { get; set; }
    public decimal? CreditLimit { get; set; }
}
