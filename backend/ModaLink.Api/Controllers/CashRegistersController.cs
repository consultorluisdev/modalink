using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Data;
using ModaLink.Api.Models;

[ApiController]
[Route("api/cashregisters")]
[Authorize(Roles = "Administrador,Vendedor")]
public class CashRegistersController : ControllerBase
{
    private readonly AppDbContext _context;

    public CashRegistersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var register = await _context.CashRegisters
            .Include(register => register.Expenses)
            .FirstOrDefaultAsync(register => register.UserId == userId && register.Status == "Open", ct);

        if (register is null) return Ok(null);

        var payments = await _context.Payments
            .Where(payment => payment.CashRegisterId == register.Id && payment.ReversedAt == null)
            .OrderBy(payment => payment.PaidAt)
            .ToListAsync(ct);

        var cashReceived = payments
            .Where(payment => payment.Method == "Dinheiro")
            .Sum(payment => payment.Amount);
        var expenses = register.Expenses.Sum(expense => expense.Amount);
        var expectedCash = register.OpeningAmount + cashReceived - expenses;
        var paymentsByMethod = payments
            .GroupBy(payment => payment.Method ?? "Não informado")
            .Select(group => new { Method = group.Key, Amount = group.Sum(payment => payment.Amount) })
            .OrderBy(item => item.Method)
            .ToList();

        return Ok(new
        {
            register.Id,
            register.OpenedAt,
            register.OpeningAmount,
            register.Status,
            TotalReceived = payments.Sum(payment => payment.Amount),
            CashReceived = cashReceived,
            TotalExpenses = expenses,
            ExpectedCash = expectedCash,
            PaymentsByMethod = paymentsByMethod,
            Expenses = register.Expenses
                .OrderByDescending(expense => expense.CreatedAt)
                .Select(expense => new
                {
                    expense.Id,
                    expense.Amount,
                    expense.Description,
                    expense.CreatedAt
                }),
            Payments = payments.Select(payment => new
            {
                payment.Id,
                payment.Amount,
                payment.Method,
                payment.PaidAt,
                payment.OrderId
            })
        });
    }

    [HttpPost("open")]
    public async Task<IActionResult> Open([FromBody] OpenCashRegisterDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var alreadyOpen = await _context.CashRegisters
            .AnyAsync(register => register.UserId == userId && register.Status == "Open", ct);
        if (alreadyOpen)
            return Conflict(new { message = "Você já possui um caixa aberto" });

        var register = new CashRegister
        {
            UserId = userId.Value,
            OpeningAmount = decimal.Round(dto.OpeningAmount, 2, MidpointRounding.AwayFromZero),
            OpenedAt = DateTime.UtcNow,
            Status = "Open"
        };
        _context.CashRegisters.Add(register);
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Não foi possível abrir o caixa. Atualize e tente novamente." });
        }

        return Ok(new { register.Id, register.OpenedAt, register.OpeningAmount, register.Status });
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> AddExpense([FromBody] CreateCashExpenseDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var register = await _context.CashRegisters
            .FirstOrDefaultAsync(item => item.UserId == userId && item.Status == "Open", ct);
        if (register is null)
            return Conflict(new { message = "Abra o caixa antes de registrar uma despesa" });

        var expense = new CashExpense
        {
            CashRegisterId = register.Id,
            Amount = decimal.Round(dto.Amount, 2, MidpointRounding.AwayFromZero),
            Description = dto.Description.Trim(),
            CreatedAt = DateTime.UtcNow,
            UserId = userId
        };
        _context.CashExpenses.Add(expense);
        await _context.SaveChangesAsync(ct);

        return Ok(new { expense.Id, expense.Amount, expense.Description, expense.CreatedAt });
    }

    [HttpPost("close")]
    public async Task<IActionResult> Close([FromBody] CloseCashRegisterDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var register = await _context.CashRegisters
            .Include(item => item.Expenses)
            .FirstOrDefaultAsync(item => item.UserId == userId && item.Status == "Open", ct);
        if (register is null)
            return Conflict(new { message = "Não há caixa aberto para fechar" });

        var payments = await _context.Payments
            .Where(payment => payment.CashRegisterId == register.Id && payment.ReversedAt == null)
            .ToListAsync(ct);
        var cashReceived = payments
            .Where(payment => payment.Method == "Dinheiro")
            .Sum(payment => payment.Amount);
        var expenses = register.Expenses.Sum(expense => expense.Amount);
        var expectedCash = register.OpeningAmount + cashReceived - expenses;

        register.Status = "Closed";
        register.ClosedAt = DateTime.UtcNow;
        register.ClosingAmount = decimal.Round(dto.ClosingAmount, 2, MidpointRounding.AwayFromZero);
        await _context.SaveChangesAsync(ct);

        return Ok(new
        {
            register.Id,
            register.ClosedAt,
            register.ClosingAmount,
            ExpectedCash = expectedCash,
            Difference = register.ClosingAmount.Value - expectedCash,
            TotalReceived = payments.Sum(payment => payment.Amount),
            CashReceived = cashReceived,
            TotalExpenses = expenses
        });
    }

    private int? GetUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }
}
