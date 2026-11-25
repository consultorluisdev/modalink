using System.ComponentModel.DataAnnotations;

public class OpenCashRegisterDto
{
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal OpeningAmount { get; set; }
}

public class CreateCashExpenseDto
{
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; set; }

    [Required, StringLength(300, MinimumLength = 2)]
    public string Description { get; set; } = string.Empty;
}

public class CloseCashRegisterDto
{
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal ClosingAmount { get; set; }
}
