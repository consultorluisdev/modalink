using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FinancesController : ControllerBase
{
    private readonly AppDbContext _context;

    public FinancesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("receivable")]
    public async Task<IActionResult> GetReceivable()
    {
        var installments = await _context.Installments
            .Include(i => i.Order)
            .ThenInclude(o => o!.Customer)
            .OrderBy(i => i.DueDate)
            .ToListAsync();

        var totalReceivable = installments.Where(i => !i.IsPaid).Sum(i => i.Amount);
        var totalPaidThisMonth = installments
            .Where(i => i.IsPaid && i.PaidAt.HasValue && i.PaidAt.Value.Month == DateTime.UtcNow.Month)
            .Sum(i => i.PaidAmount ?? i.Amount);
        var overdue = installments.Where(i => !i.IsPaid && i.DueDate < DateTime.UtcNow).Sum(i => i.Amount);
        var dueSoon = installments.Where(i => !i.IsPaid && i.DueDate >= DateTime.UtcNow).Sum(i => i.Amount);

        var items = installments.Select(i => new
        {
            i.Id,
            i.InstallmentNumber,
            i.Amount,
            i.DueDate,
            i.IsPaid,
            i.PaidAt,
            i.PaidAmount,
            OrderId = i.Order!.Id,
            CustomerName = i.Order.Customer?.Name ?? "Consumidor Final"
        }).ToList();

        return Ok(new
        {
            totalReceivable,
            totalPaidThisMonth,
            overdue,
            dueSoon,
            items
        });
    }

    [HttpGet("receivable/summary")]
    public async Task<IActionResult> GetSummary()
    {
        var totalPending = await _context.Installments
            .Where(i => !i.IsPaid)
            .SumAsync(i => i.Amount);

        var overdueCount = await _context.Installments
            .CountAsync(i => !i.IsPaid && i.DueDate < DateTime.UtcNow);

        var thisMonth = DateTime.UtcNow.Month;
        var thisYear = DateTime.UtcNow.Year;
        var receivedThisMonth = await _context.Installments
            .Where(i => i.IsPaid && i.PaidAt!.Value.Month == thisMonth && i.PaidAt!.Value.Year == thisYear)
            .SumAsync(i => i.PaidAmount ?? i.Amount);

        var totalInstallments = await _context.Installments.CountAsync();
        var paidInstallments = await _context.Installments.CountAsync(i => i.IsPaid);

        return Ok(new
        {
            totalPending,
            overdueCount,
            receivedThisMonth,
            totalInstallments,
            paidInstallments
        });
    }

    [HttpPost("installments/{id}/pay")]
    public async Task<IActionResult> PayInstallment(int id, [FromBody] PayInstallmentDto? dto)
    {
        var installment = await _context.Installments.FindAsync(id);
        if (installment == null)
            return NotFound(new { message = "Parcela não encontrada" });

        installment.IsPaid = true;
        installment.PaidAt = DateTime.UtcNow;
        installment.PaidAmount = dto?.Amount ?? installment.Amount;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Parcela baixada com sucesso" });
    }

    [HttpPost("installments/{id}/unpay")]
    public async Task<IActionResult> UnpayInstallment(int id)
    {
        var installment = await _context.Installments.FindAsync(id);
        if (installment == null)
            return NotFound(new { message = "Parcela não encontrada" });

        installment.IsPaid = false;
        installment.PaidAt = null;
        installment.PaidAmount = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Parcela reaberta" });
    }

    [HttpGet("customer/{customerId}")]
    public async Task<IActionResult> GetCustomerBalance(int customerId)
    {
        var installments = await _context.Installments
            .Include(i => i.Order)
            .Where(i => i.Order!.CustomerId == customerId)
            .OrderBy(i => i.DueDate)
            .ToListAsync();

        var totalOwed = installments.Where(i => !i.IsPaid).Sum(i => i.Amount);
        var overdue = installments.Where(i => !i.IsPaid && i.DueDate < DateTime.UtcNow).Sum(i => i.Amount);

        return Ok(new
        {
            totalOwed,
            overdue,
            installmentsCount = installments.Count,
            pendingCount = installments.Count(i => !i.IsPaid),
            items = installments.Select(i => new
            {
                i.Id,
                i.InstallmentNumber,
                i.Amount,
                i.DueDate,
                i.IsPaid,
                i.PaidAt,
                i.PaidAmount,
                OrderId = i.Order!.Id
            })
        });
    }
}

public class PayInstallmentDto
{
    public decimal? Amount { get; set; }
}
