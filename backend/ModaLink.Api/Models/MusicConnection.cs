namespace ModaLink.Api.Models;

public class MusicConnection
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Provider { get; set; } = string.Empty;
    public string ProtectedAccessToken { get; set; } = string.Empty;
    public string? ProtectedRefreshToken { get; set; }
    public string? ExternalUserId { get; set; }
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
}
