public class CreateOrderDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Discount { get; set; }
    public int? InstallmentCount { get; set; }
    public decimal? DownPayment { get; set; }
    public decimal? InterestRate { get; set; }
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreateOrderItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
