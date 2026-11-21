using System.Globalization;
using System.Text;

namespace ModaLink.Api.Common;

public static class PaymentMethods
{
    public const string Pix = "Pix";
    public const string Cartao = "Cartão";
    public const string Debito = "Débito";
    public const string Dinheiro = "Dinheiro";
    public const string Crediario = "Crediário";

    public static bool TryNormalize(string? value, out string normalized)
    {
        normalized = string.Empty;

        if (string.IsNullOrWhiteSpace(value))
            return false;

        var key = RemoveDiacritics(value.Trim()).ToLowerInvariant();

        switch (key)
        {
            case "pix":
                normalized = Pix;
                return true;
            case "cartao":
                normalized = Cartao;
                return true;
            case "debito":
                normalized = Debito;
                return true;
            case "dinheiro":
                normalized = Dinheiro;
                return true;
            case "crediario":
                normalized = Crediario;
                return true;
            default:
                return false;
        }
    }

    private static string RemoveDiacritics(string input)
    {
        var sb = new StringBuilder(input.Length);

        foreach (var ch in input.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(ch);
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }
}
