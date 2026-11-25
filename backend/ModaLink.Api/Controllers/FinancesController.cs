using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ModaLink.Api.Data;
using ModaLink.Api.Common;
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
            .Include(i => i.Payments)
            .OrderBy(i => i.DueDate)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var totalReceivable = installments.Sum(GetOutstandingAmount);
        var paymentsThisMonth = await _context.Payments
            .Where(p => p.ReversedAt == null && p.PaidAt.Month == now.Month && p.PaidAt.Year == now.Year)
            .Select(p => p.Amount)
            .ToListAsync();
        var totalPaidThisMonth = paymentsThisMonth.Sum();
        var overdue = installments
            .Where(i => !i.IsPaid && i.DueDate < now)
            .Sum(GetOutstandingAmount);
        var dueSoon = installments
            .Where(i => !i.IsPaid && i.DueDate >= now)
            .Sum(GetOutstandingAmount);

        var items = installments.Select(i => new
        {
            i.Id,
            i.InstallmentNumber,
            Amount = GetOutstandingAmount(i),
            OriginalAmount = i.Amount,
            i.DueDate,
            i.IsPaid,
            i.PaidAt,
            PaidAmount = GetPaidAmount(i),
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
        var installments = await _context.Installments
            .Include(i => i.Payments)
            .ToListAsync();
        var now = DateTime.UtcNow;
        var totalPending = installments.Sum(GetOutstandingAmount);
        var overdueCount = installments.Count(i => !i.IsPaid && i.DueDate < now);
        var receivedPaymentsThisMonth = await _context.Payments
            .Where(p => p.ReversedAt == null && p.PaidAt.Month == now.Month && p.PaidAt.Year == now.Year)
            .Select(p => p.Amount)
            .ToListAsync();
        var receivedThisMonth = receivedPaymentsThisMonth.Sum();
        var totalInstallments = installments.Count;
        var paidInstallments = installments.Count(i => i.IsPaid);

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
        var installment = await _context.Installments
            .Include(i => i.Order)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (installment == null)
            return NotFound(new { message = "Parcela não encontrada" });

        if (installment.IsPaid)
            return Conflict(new { message = "Parcela já está paga"});

        if (!PaymentMethods.TryNormalize(dto?.Method, out var method) || method == PaymentMethods.Crediario)
            return BadRequest(new { message = "Informe uma forma de recebimento válida" });

        var paidBefore = GetPaidAmount(installment);
        var outstanding = installment.Amount - paidBefore;
        var amount = dto?.Amount ?? outstanding;
        if (amount <= 0)
            return BadRequest(new { message = "Valor informado deve ser maior que zero" });
        if (amount > outstanding)
            return BadRequest(new { message = "Valor informado não pode ser maior que o saldo da parcela" });

        var now = DateTime.UtcNow;
        var paidTotal = paidBefore + amount;
        var order = installment.Order ?? await _context.Orders.FindAsync(installment.OrderId);
        if (order is null)
            return NotFound(new { message = "Venda da parcela não encontrada" });
        var userId = GetUserId();
        var cashRegister = userId is null
            ? null
            : await _context.CashRegisters.FirstOrDefaultAsync(
                register => register.UserId == userId && register.Status == "Open");
        if (method == PaymentMethods.Dinheiro && cashRegister is null)
            return Conflict(new { message = "Abra o caixa antes de receber em dinheiro" });

        _context.Payments.Add(new Payment
        {
            OrderId = order.Id,
            InstallmentId = installment.Id,
            Amount = amount,
            Method = method,
            PaidAt = now,
            UserId = userId,
            CashRegisterId = cashRegister?.Id
        });

        installment.PaidAmount = paidTotal;
        installment.IsPaid = paidTotal >= installment.Amount;
        installment.PaidAt = installment.IsPaid ? now : null;

        if (order != null && order.PaymentMethod == "Crediário" && (order.InstallmentCount ?? 0) > 0)
        {
            var allPaid = !await _context.Installments
                .Where(i => i.OrderId == order.Id && i.Id != installment.Id)
                .AnyAsync(i => !i.IsPaid);
            if (allPaid)
                order.Status = "Paid";
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = installment.IsPaid ? "Parcela quitada com sucesso" : "Pagamento parcial registrado com sucesso",
            installment.IsPaid,
            PaidAmount = installment.PaidAmount,
            OutstandingAmount = Math.Max(0m, installment.Amount - paidTotal)
        });
    }

    [HttpPost("installments/{id}/unpay")]
    public async Task<IActionResult> UnpayInstallment(int id)
    {
        var installment = await _context.Installments
            .Include(i => i.Order)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (installment == null)
            return NotFound(new { message = "Parcela não encontrada" });

        if (installment.Payments.All(p => p.ReversedAt != null) && !installment.IsPaid)
            return Conflict(new { message = "Parcela já está em aberto"});

        var now = DateTime.UtcNow;
        foreach (var payment in installment.Payments.Where(p => p.ReversedAt == null))
            payment.ReversedAt = now;

        installment.IsPaid = false;
        installment.PaidAt = null;
        installment.PaidAmount = null;

        var order = installment.Order ?? await _context.Orders.FindAsync(installment.OrderId);
        if(order != null && order.PaymentMethod == "Crediário" && (order.InstallmentCount ?? 0) > 0)
        {
            // voltou a ter aberta
            order.Status = "Pending";
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Parcela reaberta" });
    }

    [HttpGet("customer/{customerId}")]
    public async Task<IActionResult> GetCustomerBalance(int customerId)
    {
        var installments = await _context.Installments
            .Include(i => i.Order)
            .Include(i => i.Payments)
            .Where(i => i.Order!.CustomerId == customerId)
            .OrderBy(i => i.DueDate)
            .ToListAsync();

        var totalOwed = installments.Sum(GetOutstandingAmount);
        var overdue = installments.Where(i => !i.IsPaid && i.DueDate < DateTime.UtcNow).Sum(GetOutstandingAmount);

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
                Amount = GetOutstandingAmount(i),
                OriginalAmount = i.Amount,
                i.DueDate,
                i.IsPaid,
                i.PaidAt,
                PaidAmount = GetPaidAmount(i),
                OrderId = i.Order!.Id
            })
        });
    }

    private static decimal GetPaidAmount(Installment installment)
    {
        var recordedPayments = installment.Payments
            .Where(p => p.ReversedAt == null)
            .Sum(p => p.Amount);

        if (recordedPayments > 0 || !installment.IsPaid)
            return recordedPayments;

        return installment.PaidAmount ?? installment.Amount;
    }

    private static decimal GetOutstandingAmount(Installment installment)
        => Math.Max(0m, installment.Amount - GetPaidAmount(installment));

    private int? GetUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }
}
