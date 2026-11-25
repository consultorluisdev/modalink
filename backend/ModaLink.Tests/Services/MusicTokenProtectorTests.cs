using Microsoft.Extensions.Configuration;
using ModaLink.Api.Services;

namespace ModaLink.Tests.Services;

public sealed class MusicTokenProtectorTests
{
    [Fact]
    public void ProtectAndUnprotect_RoundTrip_ReturnsOriginalToken()
    {
        var protector = CreateProtector();
        const string token = "private-provider-access-token";

        var protectedToken = protector.Protect(token);

        Assert.NotEqual(token, protectedToken);
        Assert.Equal(token, protector.Unprotect(protectedToken));
    }

    [Fact]
    public void Unprotect_TamperedCiphertext_ThrowsCryptographicException()
    {
        var protector = CreateProtector();
        var protectedToken = protector.Protect("private-provider-access-token");
        var payload = Convert.FromBase64String(protectedToken);
        payload[^1] ^= 0x01;

        Assert.ThrowsAny<System.Security.Cryptography.CryptographicException>(
            () => protector.Unprotect(Convert.ToBase64String(payload)));
    }

    [Fact]
    public void Protect_WithoutEncryptionKey_ThrowsConfigurationError()
    {
        var protector = new MusicTokenProtector(
            new ConfigurationBuilder().AddInMemoryCollection().Build());

        Assert.Throws<InvalidOperationException>(() => protector.ValidateConfiguration());
    }

    private static MusicTokenProtector CreateProtector()
    {
        var key = Convert.ToBase64String(Enumerable.Range(0, 32).Select(value => (byte)value).ToArray());
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Music:TokenEncryptionKey"] = key
            })
            .Build();
        return new MusicTokenProtector(configuration);
    }
}
