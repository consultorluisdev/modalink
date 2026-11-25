namespace ModaLink.Api.Models;

public class CashExpense
{
    public int Id { get; set; }
    public int CashRegisterId { get; set; }
    public CashRegister CashRegister { get; set; } = null!;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? UserId { get; set; }
}
