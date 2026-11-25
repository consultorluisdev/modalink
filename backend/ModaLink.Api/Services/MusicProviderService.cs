using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;

namespace ModaLink.Api.Services;

public sealed record MusicTokens(string AccessToken, string? RefreshToken, DateTime? ExpiresAt);

public sealed record MusicPlaylist(
    string Id,
    string Name,
    string? Description,
    string? ImageUrl,
    int? TrackCount,
    string Url,
    string EmbedUrl);

public sealed class MusicProviderService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public MusicProviderService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public string BuildAuthorizationUrl(string provider, string state)
    {
        var redirectUri = GetSetting(provider, "RedirectUri");
        var clientId = GetSetting(provider, "ClientId");
        _ = GetSetting(provider, "ClientSecret");
        var parameters = new Dictionary<string, string?>
        {
            ["client_id"] = clientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["state"] = state
        };

        var authorizationEndpoint = provider switch
        {
            "spotify" => "https://accounts.spotify.com/authorize",
            "youtube" => "https://accounts.google.com/o/oauth2/v2/auth",
            "deezer" => "https://connect.deezer.com/oauth/auth.php",
            _ => throw new ArgumentOutOfRangeException(nameof(provider))
        };

        switch (provider)
        {
            case "spotify":
                parameters["scope"] = "playlist-read-private playlist-read-collaborative";
                break;
            case "youtube":
                parameters["scope"] = "https://www.googleapis.com/auth/youtube.readonly";
                parameters["access_type"] = "offline";
                parameters["prompt"] = "consent";
                break;
            case "deezer":
                parameters["app_id"] = parameters["client_id"];
                parameters.Remove("client_id");
                parameters["perms"] = "basic_access,manage_library";
                break;
        }

        return QueryHelpers.AddQueryString(authorizationEndpoint, parameters);
    }

    public async Task<MusicTokens> ExchangeCodeAsync(
        string provider,
        string code,
        CancellationToken cancellationToken)
    {
        if (provider == "deezer")
        {
            var url = QueryHelpers.AddQueryString(
                "https://connect.deezer.com/oauth/access_token.php",
                new Dictionary<string, string?>
                {
                    ["app_id"] = GetSetting(provider, "ClientId"),
                    ["secret"] = GetSetting(provider, "ClientSecret"),
                    ["code"] = code,
                    ["output"] = "json"
                });
            using var response = await _httpClientFactory.CreateClient().GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var root = document.RootElement;
            return new MusicTokens(
                root.GetProperty("access_token").GetString()
                    ?? throw new InvalidOperationException("O Deezer não retornou um access token."),
                null,
                null);
        }

        var tokenUrl = provider == "spotify"
            ? "https://accounts.spotify.com/api/token"
            : "https://oauth2.googleapis.com/token";
        var tokenParameters = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = GetSetting(provider, "RedirectUri")
        };
        if (provider != "spotify")
        {
            tokenParameters["client_id"] = GetSetting(provider, "ClientId");
            tokenParameters["client_secret"] = GetSetting(provider, "ClientSecret");
        }
        using var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl)
        {
            Content = new FormUrlEncodedContent(tokenParameters)
        };

        if (provider == "spotify")
        {
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
                $"{GetSetting(provider, "ClientId")}:{GetSetting(provider, "ClientSecret")}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        }

        using var tokenResponse = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
        tokenResponse.EnsureSuccessStatusCode();
        return ParseTokenResponse(
            await tokenResponse.Content.ReadAsStringAsync(cancellationToken),
            provider,
            null);
    }

    public async Task<MusicTokens> RefreshAsync(
        string provider,
        string refreshToken,
        CancellationToken cancellationToken)
    {
        if (provider == "deezer")
        {
            throw new InvalidOperationException("A conta Deezer expirou. Desconecte e conecte novamente.");
        }

        var url = provider == "spotify"
            ? "https://accounts.spotify.com/api/token"
            : "https://oauth2.googleapis.com/token";
        var refreshParameters = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken
        };
        if (provider != "spotify")
        {
            refreshParameters["client_id"] = GetSetting(provider, "ClientId");
            refreshParameters["client_secret"] = GetSetting(provider, "ClientSecret");
        }
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new FormUrlEncodedContent(refreshParameters)
        };

        if (provider == "spotify")
        {
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
                $"{GetSetting(provider, "ClientId")}:{GetSetting(provider, "ClientSecret")}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        }

        using var response = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return ParseTokenResponse(
            await response.Content.ReadAsStringAsync(cancellationToken),
            provider,
            refreshToken);
    }

    public async Task<IReadOnlyList<MusicPlaylist>> GetPlaylistsAsync(
        string provider,
        string accessToken,
        CancellationToken cancellationToken)
    {
        using var request = provider switch
        {
            "spotify" => new HttpRequestMessage(
                HttpMethod.Get,
                "https://api.spotify.com/v1/me/playlists?limit=50"),
            "youtube" => new HttpRequestMessage(
                HttpMethod.Get,
                "https://youtube.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50"),
            "deezer" => new HttpRequestMessage(
                HttpMethod.Get,
                "https://api.deezer.com/user/me/playlists?limit=50"),
            _ => throw new ArgumentOutOfRangeException(nameof(provider))
        };
        if (provider == "deezer")
        {
            request.RequestUri = new Uri(QueryHelpers.AddQueryString(
                request.RequestUri!.ToString(),
                "access_token",
                accessToken));
        }
        else
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        }

        using var response = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        return provider switch
        {
            "spotify" => ParseSpotifyPlaylists(document.RootElement),
            "youtube" => ParseYouTubePlaylists(document.RootElement),
            "deezer" => ParseDeezerPlaylists(document.RootElement),
            _ => throw new ArgumentOutOfRangeException(nameof(provider))
        };
    }

    private string GetSetting(string provider, string name)
    {
        var section = provider switch
        {
            "spotify" => "Spotify",
            "youtube" => "YouTube",
            "deezer" => "Deezer",
            _ => throw new ArgumentOutOfRangeException(nameof(provider))
        };

        var value = _configuration[$"Music:{section}:{name}"];
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"Configure Music:{section}:{name} no ambiente da API.");

        return value;
    }

    private static MusicTokens ParseTokenResponse(string json, string provider, string? previousRefreshToken)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var accessToken = root.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("O serviço não retornou um access token.");
        var refreshToken = root.TryGetProperty("refresh_token", out var refresh)
            ? refresh.GetString()
            : previousRefreshToken;
        DateTime? expiresAt = root.TryGetProperty("expires_in", out var expires)
            && expires.TryGetInt32(out var seconds)
            ? DateTime.UtcNow.AddSeconds(seconds)
            : null;
        return new MusicTokens(accessToken, refreshToken, expiresAt);
    }

    private static IReadOnlyList<MusicPlaylist> ParseSpotifyPlaylists(JsonElement root)
    {
        if (!root.TryGetProperty("items", out var items)) return Array.Empty<MusicPlaylist>();
        return items.EnumerateArray().Select(item =>
        {
            var id = RequiredString(item, "id");
            return new MusicPlaylist(
                id,
                RequiredString(item, "name"),
                OptionalString(item, "description"),
                FirstImage(item, "images"),
                OptionalInt32(item, "tracks", "total"),
                $"https://open.spotify.com/playlist/{Uri.EscapeDataString(id)}",
                $"https://open.spotify.com/embed/playlist/{Uri.EscapeDataString(id)}");
        }).ToArray();
    }

    private static IReadOnlyList<MusicPlaylist> ParseYouTubePlaylists(JsonElement root)
    {
        if (!root.TryGetProperty("items", out var items)) return Array.Empty<MusicPlaylist>();
        return items.EnumerateArray().Select(item =>
        {
            var id = RequiredString(item, "id");
            var snippet = item.GetProperty("snippet");
            return new MusicPlaylist(
                id,
                RequiredString(snippet, "title"),
                OptionalString(snippet, "description"),
                FirstImage(snippet, "thumbnails"),
                OptionalInt32(item, "contentDetails", "itemCount"),
                $"https://www.youtube.com/playlist?list={Uri.EscapeDataString(id)}",
                $"https://www.youtube-nocookie.com/embed/videoseries?list={Uri.EscapeDataString(id)}");
        }).ToArray();
    }

    private static IReadOnlyList<MusicPlaylist> ParseDeezerPlaylists(JsonElement root)
    {
        if (!root.TryGetProperty("data", out var items)) return Array.Empty<MusicPlaylist>();
        return items.EnumerateArray().Select(item =>
        {
            var id = RequiredString(item, "id");
            return new MusicPlaylist(
                id,
                RequiredString(item, "title"),
                null,
                OptionalString(item, "picture_medium"),
                OptionalInt32(item, "nb_tracks"),
                $"https://www.deezer.com/playlist/{Uri.EscapeDataString(id)}",
                $"https://widget.deezer.com/widget/dark/playlist/{Uri.EscapeDataString(id)}");
        }).ToArray();
    }

    private static string RequiredString(JsonElement element, string property)
        => element.GetProperty(property).GetString()
            ?? throw new InvalidOperationException($"Resposta do serviço sem o campo {property}.");

    private static string? OptionalString(JsonElement element, string property)
        => element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string? FirstImage(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var images)) return null;
        if (images.ValueKind == JsonValueKind.Array && images.GetArrayLength() > 0)
            return OptionalString(images[0], "url") ?? OptionalString(images[0], "src");
        if (images.ValueKind == JsonValueKind.Object)
        {
            foreach (var size in new[] { "high", "medium", "default" })
            {
                if (images.TryGetProperty(size, out var thumbnail))
                    return OptionalString(thumbnail, "url");
            }
        }
        return null;
    }

    private static int? OptionalInt32(JsonElement element, string property, string? child = null)
    {
        if (!element.TryGetProperty(property, out var value)) return null;
        if (child is not null && !value.TryGetProperty(child, out value)) return null;
        return value.TryGetInt32(out var result) ? result : null;
    }
}
