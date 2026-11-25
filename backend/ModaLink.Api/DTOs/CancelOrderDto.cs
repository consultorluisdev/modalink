using System.ComponentModel.DataAnnotations;

public class CancelOrderDto
{
    [MaxLength(500)]
    public string? Reason { get; set; }
}
