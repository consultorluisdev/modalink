using System.Security.Cryptography;
using System.Text;

namespace ModaLink.Api.Services;

public sealed class MusicTokenProtector
{
    private readonly IConfiguration _configuration;

    public MusicTokenProtector(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string Protect(string token)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plaintext = Encoding.UTF8.GetBytes(token);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(GetKey(), tag.Length);
        aes.Encrypt(nonce, plaintext, ciphertext, tag);

        var payload = new byte[nonce.Length + tag.Length + ciphertext.Length];
        nonce.CopyTo(payload, 0);
        tag.CopyTo(payload, nonce.Length);
        ciphertext.CopyTo(payload, nonce.Length + tag.Length);
        return Convert.ToBase64String(payload);
    }

    public string Unprotect(string protectedToken)
    {
        var payload = Convert.FromBase64String(protectedToken);
        if (payload.Length < 28)
            throw new CryptographicException("O token de música armazenado está inválido.");

        var nonce = payload.AsSpan(0, 12);
        var tag = payload.AsSpan(12, 16);
        var ciphertext = payload.AsSpan(28);
        var plaintext = new byte[ciphertext.Length];
        using var aes = new AesGcm(GetKey(), tag.Length);
        aes.Decrypt(nonce, ciphertext, tag, plaintext);
        return Encoding.UTF8.GetString(plaintext);
    }

    public void ValidateConfiguration() => _ = GetKey();

    private byte[] GetKey()
    {
        var configuredKey = _configuration["Music:TokenEncryptionKey"];
        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            throw new InvalidOperationException(
                "Configure Music:TokenEncryptionKey com uma chave aleatória de 32 bytes em Base64.");
        }

        byte[] key;
        try
        {
            key = Convert.FromBase64String(configuredKey);
        }
        catch (FormatException exception)
        {
            throw new InvalidOperationException("Music:TokenEncryptionKey precisa estar em Base64.", exception);
        }

        if (key.Length != 32)
            throw new InvalidOperationException("Music:TokenEncryptionKey precisa conter exatamente 32 bytes.");

        return key;
    }
}
