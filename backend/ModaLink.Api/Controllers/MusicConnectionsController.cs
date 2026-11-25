using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ModaLink.Api.Data;
using ModaLink.Api.Models;
using ModaLink.Api.Services;

[ApiController]
[Route("api/music-connections")]
[Authorize]
public sealed class MusicConnectionsController : ControllerBase
{
    private static readonly string[] Providers = ["spotify", "youtube", "deezer"];
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly MusicProviderService _providerService;
    private readonly MusicTokenProtector _tokenProtector;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MusicConnectionsController> _logger;

    public MusicConnectionsController(
        AppDbContext context,
        IMemoryCache cache,
        MusicProviderService providerService,
        MusicTokenProtector tokenProtector,
        IConfiguration configuration,
        ILogger<MusicConnectionsController> logger)
    {
        _context = context;
        _cache = cache;
        _providerService = providerService;
        _tokenProtector = tokenProtector;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetConnections(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var connections = await _context.MusicConnections
            .Where(connection => connection.UserId == userId)
            .ToDictionaryAsync(connection => connection.Provider, cancellationToken);

        return Ok(Providers.Select(provider => new
        {
            provider,
            connected = connections.ContainsKey(provider),
            connectedAt = connections.TryGetValue(provider, out var connection)
                ? connection.ConnectedAt
                : (DateTime?)null
        }));
    }

    [HttpPost("{provider}/connect")]
    public IActionResult Connect(string provider)
    {
        if (!IsSupportedProvider(provider)) return NotFound();
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var state = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
            _tokenProtector.ValidateConfiguration();
            var authorizationUrl = _providerService.BuildAuthorizationUrl(provider, state);
            _cache.Set(
                GetStateKey(state),
                new OAuthState(userId.Value, provider),
                TimeSpan.FromMinutes(10));
            return Ok(new { authorizationUrl });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(
                title: "Conexão de música ainda não configurada",
                detail: exception.Message,
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }

    [AllowAnonymous]
    [HttpGet("{provider}/callback")]
    public async Task<IActionResult> Callback(
        string provider,
        [FromQuery] string? state,
        [FromQuery] string? code,
        [FromQuery] string? error,
        CancellationToken cancellationToken)
    {
        if (!IsSupportedProvider(provider) || string.IsNullOrWhiteSpace(state))
            return RedirectToFrontend("error", "state");

        var stateKey = GetStateKey(state);
        if (!_cache.TryGetValue(stateKey, out OAuthState? oauthState)
            || oauthState is null
            || oauthState.Provider != provider)
        {
            return RedirectToFrontend("error", "state");
        }
        _cache.Remove(stateKey);

        if (!string.IsNullOrWhiteSpace(error) || string.IsNullOrWhiteSpace(code))
            return RedirectToFrontend("error", "authorization");

        try
        {
            var tokens = await _providerService.ExchangeCodeAsync(provider, code, cancellationToken);
            var connection = await _context.MusicConnections
                .SingleOrDefaultAsync(
                    item => item.UserId == oauthState.UserId && item.Provider == provider,
                    cancellationToken);

            if (connection is null)
            {
                connection = new MusicConnection
                {
                    UserId = oauthState.UserId,
                    Provider = provider
                };
                _context.MusicConnections.Add(connection);
            }

            connection.ProtectedAccessToken = _tokenProtector.Protect(tokens.AccessToken);
            connection.ProtectedRefreshToken = tokens.RefreshToken is null
                ? null
                : _tokenProtector.Protect(tokens.RefreshToken);
            connection.ExpiresAt = tokens.ExpiresAt;
            connection.ConnectedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return RedirectToFrontend("connected", provider);
        }
        catch (Exception exception) when (
            exception is HttpRequestException
            or InvalidOperationException
            or CryptographicException
            or FormatException)
        {
            _logger.LogWarning(exception,
                "OAuth callback failed for music provider {Provider} and user {UserId}",
                provider,
                oauthState.UserId);
            return RedirectToFrontend("error", "provider");
        }
    }

    [HttpGet("{provider}/playlists")]
    public async Task<IActionResult> GetPlaylists(string provider, CancellationToken cancellationToken)
    {
        if (!IsSupportedProvider(provider)) return NotFound();
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var connection = await _context.MusicConnections
            .SingleOrDefaultAsync(
                item => item.UserId == userId && item.Provider == provider,
                cancellationToken);
        if (connection is null)
            return NotFound(new { message = "Conecte sua conta para carregar suas playlists." });

        try
        {
            var accessToken = _tokenProtector.Unprotect(connection.ProtectedAccessToken);
            if (connection.ExpiresAt is not null
                && connection.ExpiresAt <= DateTime.UtcNow.AddMinutes(1))
            {
                if (string.IsNullOrWhiteSpace(connection.ProtectedRefreshToken))
                    return Conflict(new { message = "A autorização expirou. Desconecte e conecte a conta novamente." });

                var refreshToken = _tokenProtector.Unprotect(connection.ProtectedRefreshToken);
                var refreshed = await _providerService.RefreshAsync(provider, refreshToken, cancellationToken);
                accessToken = refreshed.AccessToken;
                connection.ProtectedAccessToken = _tokenProtector.Protect(refreshed.AccessToken);
                connection.ProtectedRefreshToken = refreshed.RefreshToken is null
                    ? connection.ProtectedRefreshToken
                    : _tokenProtector.Protect(refreshed.RefreshToken);
                connection.ExpiresAt = refreshed.ExpiresAt;
                await _context.SaveChangesAsync(cancellationToken);
            }

            return Ok(await _providerService.GetPlaylistsAsync(provider, accessToken, cancellationToken));
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception,
                "Playlist request failed for music provider {Provider} and user {UserId}",
                provider,
                userId);
            return Conflict(new { message = "O serviço não autorizou o acesso. Reconecte sua conta e tente novamente." });
        }
        catch (Exception exception) when (exception is CryptographicException or FormatException)
        {
            return Conflict(new { message = "A autorização não pode ser lida. Desconecte e conecte sua conta novamente." });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(
                title: "Não foi possível carregar as playlists",
                detail: exception.Message,
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }

    [HttpDelete("{provider}")]
    public async Task<IActionResult> Disconnect(string provider, CancellationToken cancellationToken)
    {
        if (!IsSupportedProvider(provider)) return NotFound();
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var connection = await _context.MusicConnections
            .SingleOrDefaultAsync(
                item => item.UserId == userId && item.Provider == provider,
                cancellationToken);
        if (connection is null) return NoContent();

        _context.MusicConnections.Remove(connection);
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private RedirectResult RedirectToFrontend(string result, string value)
    {
        var frontendUrl = _configuration["Frontend:BaseUrl"]
            ?? _configuration["FRONTEND_URL"]
            ?? "http://localhost:5173";
        var target = QueryHelpers.AddQueryString(
            $"{frontendUrl.TrimEnd('/')}/dashboard",
            new Dictionary<string, string?> { ["musicConnection"] = result, ["provider"] = value });
        return Redirect(target);
    }

    private int? GetUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }

    private static bool IsSupportedProvider(string provider)
        => Providers.Contains(provider, StringComparer.Ordinal);

    private static string GetStateKey(string state) => $"music-oauth:{state}";

    private sealed record OAuthState(int UserId, string Provider);
}
