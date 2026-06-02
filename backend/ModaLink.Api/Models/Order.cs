public class Order
{
    public int Id { get; set; }
    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? InstallmentCount { get; set; }
    public decimal? DownPayment { get; set; }
    public decimal? InterestRate { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public List<Installment> Installments { get; set; } = new();
}
