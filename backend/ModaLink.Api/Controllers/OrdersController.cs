using ModaLink.Api.Common;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;
using ModaLink.Api.Data;

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
    [Authorize(Roles = "Administrador,Vendedor")]
    public async Task<IActionResult> Create(CreateOrderDto dto, CancellationToken ct)
    {
        // 1. Validação básica
        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            return BadRequest(new { message = "Nome do cliente é obrigatório" });

        // 2. Normalizar forma de pagamento
        if (!PaymentMethods.TryNormalize(dto.PaymentMethod, out var paymentMethod))
            return BadRequest(new { message = "Forma de pagamento inválida" });

        var isCredit = paymentMethod == PaymentMethods.Crediario;
        var installmentCount = dto.InstallmentCount ?? 0;
        var downPayment = dto.DownPayment ?? 0m;
        var interestRate = dto.InterestRate ?? 0m;

        // 3. Regras de crédito
        if (isCredit)
        {
            if (installmentCount < 1 || installmentCount > 12)
                return BadRequest(new { message = "Crediário exige de 1 a 12 parcelas" });
            if (downPayment < 0)
                return BadRequest(new { message = "Entrada não pode ser negativa" });
            if (interestRate < 0)
                return BadRequest(new { message = "Juros não podem ser negativos" });
        }
        else
        {
            if (installmentCount != 0 || downPayment != 0 || interestRate != 0)
                return BadRequest(new { message = "Parcelamento, entrada e juros são exclusivos do crediário" });
        }

        // 4. Produto duplicado no payload
        if (dto.Items.GroupBy(i => i.ProductId).Any(g => g.Count() > 1))
            return BadRequest(new { message = "Produto duplicado no pedido" });

        // 5. Carregar produtos uma vez, AsNoTracking
        var ids = dto.Items.Select(i => i.ProductId).ToList();
        var products = await _context.Products
            .AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var missing = ids.FirstOrDefault(id => !products.ContainsKey(id));
        if (missing != 0)
            return BadRequest(new { message = $"Produto {missing} não encontrado" });

        // 6. Calcular totais por item (preço do banco)
        decimal subtotal = 0m;
        var itemTotals = new Dictionary<int, decimal>();
        foreach (var item in dto.Items)
        {
            var product = products[item.ProductId];
            var itemTotal = Math.Round(product.Price * item.Quantity, 2, MidpointRounding.AwayFromZero);
            itemTotals[item.ProductId] = itemTotal;
            subtotal += itemTotal;
        }
        subtotal = Math.Round(subtotal, 2, MidpointRounding.AwayFromZero);

        // 7. Desconto e total
        var discount = Math.Round(dto.Discount, 2, MidpointRounding.AwayFromZero);
        if (discount < 0 || discount > subtotal)
            return BadRequest(new { message = "Desconto inválido" });

        var total = Math.Round(subtotal - discount, 2, MidpointRounding.AwayFromZero);
        if (total < 0)
            return BadRequest(new { message = "Total não pode ser negativo" });

        // 8. Financiamento (só crédito)
        decimal? financed = null;
        decimal? interest = null;
        decimal? totalWithInterest = null;

        if (isCredit)
        {
            if (downPayment > total)
                return BadRequest(new { message = "Entrada não pode ser maior que o total" });
            if (downPayment == total)
                return BadRequest(new { message = "Entrada deve ser menor que o total" });

            financed = Math.Round(total - downPayment, 2, MidpointRounding.AwayFromZero);
            totalWithInterest = Math.Round(financed.Value * (1 + interestRate * installmentCount / 100m), 2, MidpointRounding.AwayFromZero);
            interest = Math.Round(totalWithInterest.Value - financed.Value, 2, MidpointRounding.AwayFromZero);
        }

        // 9. Transação única
        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        try
        {
            // 10. Cliente — find-or-create dentro da transação
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Name == dto.CustomerName.Trim(), ct);

            if (customer is null)
            {
                customer = new Customer
                {
                    Name = dto.CustomerName.Trim(),
                    Email = dto.CustomerEmail?.Trim(),
                    Phone = dto.CustomerPhone?.Trim(),
                    Active = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Customers.Add(customer);
            }

            // 11. Order — CustomerId via FK (igual ao código atual)
            var order = new Order
            {
                Customer = customer,               // EF resolve a FK no SaveChanges
                PaymentMethod = paymentMethod,
                Subtotal = subtotal,
                Discount = discount,
                Total = total,
                Status = isCredit ? OrderStatuses.Pending : OrderStatuses.Paid,
                CreatedAt = DateTime.UtcNow,
                InstallmentCount = isCredit ? installmentCount : null,
                DownPayment = isCredit && downPayment > 0 ? downPayment: null,
                InterestRate = isCredit ? interestRate : null,
                FinancedAmount = financed,
                InterestAmount = interest,
                TotalWithInterest = totalWithInterest
            };

            // 12. Itens — preço do banco
            foreach (var item in dto.Items)
            {
                var product = products[item.ProductId];
                order.Items.Add(new OrderItem
                {
                    ProductId = product.Id,
                    Quantity = item.Quantity,
                    UnitPrice = product.Price,
                    TotalPrice = itemTotals[item.ProductId]
                });
            }

            // 13. Parcelas (só crédito)
            if (isCredit)
            {
                var installmentAmount = Math.Round(totalWithInterest!.Value / installmentCount, 2, MidpointRounding.AwayFromZero);
                for (var i = 1; i <= installmentCount; i++)
                {
                    order.Installments.Add(new Installment
                    {
                        InstallmentNumber = i,
                        Amount = installmentAmount,
                        DueDate = DateTime.UtcNow.AddMonths(i),
                        IsPaid = false
                    });
                }

                var diff = totalWithInterest.Value - order.Installments.Sum(x => x.Amount);
                if (diff != 0)
                    order.Installments.Last().Amount += diff;
            }

            // 14. Payments de entrada / à vista
            var userId = GetUserId();

            if (isCredit && downPayment > 0)
            {
                order.Payments.Add(new Payment
                {
                    InstallmentId = null,
                    Amount = downPayment,
                    Method = paymentMethod,
                    PaidAt = DateTime.UtcNow,
                    UserId = userId,
                    ReversedAt = null
                });
            }

            if (!isCredit)
            {
                order.Payments.Add(new Payment
                {
                    InstallmentId = null,
                    Amount = total,
                    Method = paymentMethod,
                    PaidAt = DateTime.UtcNow,
                    UserId = userId,
                    ReversedAt = null
                });
            }

            // 15. Estoque condicional DENTRO da transação
            foreach (var item in dto.Items)
            {
                var affected = await _context.Products
                    .Where(p => p.Id == item.ProductId && p.Stock >= item.Quantity)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(p => p.Stock, p => p.Stock - item.Quantity)
                        .SetProperty(p => p.UpdatedAt, _ => DateTime.UtcNow), ct);

                if (affected == 0)
                {
                    await transaction.RollbackAsync(ct);
                    return Conflict(new { message = $"Estoque insuficiente para {products[item.ProductId].Title}" });
                }
            }

            // 16. Persistir
            _context.Orders.Add(order);
            await _context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return Ok(new
            {
                order.Id,
                order.Total,
                order.TotalWithInterest,
                order.Status
            });
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    private int? GetUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }
}
