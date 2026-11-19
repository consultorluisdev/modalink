namespace ModaLink.Api.Models;

public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int? InstallmentId { get; set; }
    public Installment? Installment { get; set; }
    public decimal Amount { get; set; }
    public string? Method { get; set; }
    public DateTime PaidAt { get; set; }
    public int? UserId { get; set; }
    public string? IdempotencyKey { get; set; }
    public DateTime? ReversedAt { get; set; }
}
