public class StoreSetting
{
    public int Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
