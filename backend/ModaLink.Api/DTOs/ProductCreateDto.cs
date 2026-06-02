using Microsoft.AspNetCore.Http;

public class ProductCreateDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Category { get; set; }
    public int Stock { get; set; }
    public IFormFile? Image { get; set; }
}
