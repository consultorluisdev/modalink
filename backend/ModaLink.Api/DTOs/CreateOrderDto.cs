using System.ComponentModel.DataAnnotations;

public class CreateOrderDto
{
    [Required, MaxLength(200)]
    public string CustomerName { get; set; } = string.Empty;
    [EmailAddress, MaxLength(200)]
    public string? CustomerEmail { get; set; }
    [MaxLength(30)]
    public string? CustomerPhone { get; set; }
    [Required, MaxLength(20)]
    public string PaymentMethod { get; set; } = string.Empty;
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal Discount { get; set; }
    [Range(1, 12)]
    public int? InstallmentCount { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal? DownPayment { get; set; }
    [MaxLength(20)]
    public string? DownPaymentMethod { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal? InterestRate { get; set; }
    [Required, MinLength(1)]
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreateOrderItemDto
{
    [Range(1, int.MaxValue)]
    public int ProductId { get; set; }
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }
    // Mantido por compatibilidade com o frontend. O backend ignora.
    public decimal UnitPrice { get; set; }
}
