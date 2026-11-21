using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Common;
using ModaLink.Api.Data;

namespace ModaLink.Api.Services;

public class OrderStatusService
{
    private readonly AppDbContext _context;

    public OrderStatusService(AppDbContext context)
    {
        _context = context;
    }

    public async Task RecalculateAsync(int orderId, CancellationToken ct = default)
    {
        var order = await _context.Orders
            .Include(o => o.Installments)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null || order.Status == OrderStatuses.Cancelled)
            return;

        order.Status = order.Installments.Count == 0 ||
                       order.Installments.All(i => i.IsPaid)
            ? OrderStatuses.Paid
            : OrderStatuses.Pending;
    }
}
