namespace ModaLink.Api.Models;

public class CashRegister
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public decimal OpeningAmount { get; set; }
    public DateTime? ClosedAt { get; set; }
    public decimal? ClosingAmount { get; set; }
    public string Status { get; set; } = "Open";
    public List<CashExpense> Expenses { get; set; } = new();
}
