using ModaLink.Api.Common;
using Xunit;

namespace ModaLink.Tests.Common;

public class PaymentMethodsTests
{
  // ---------- Casos válidos: canônico ----------

  [Theory]
  [InlineData("Pix")]
  [InlineData("pix")]
  [InlineData("PIX")]
  [InlineData("  Pix  ")]
  public void TryNormalize_Pix_DeveAceitarVariacoesDeCaixaEEspaco(string input)
  {
    var ok = PaymentMethods.TryNormalize(input, out var normalized);
    Assert.True(ok);
    Assert.Equal(PaymentMethods.Pix, normalized);
  }

  [Theory]
  [InlineData("Cartão")]
  [InlineData("cartao")]
  [InlineData("CARTÃO")]
  [InlineData("  cartao  ")]
  public void TryNormalize_Cartao_DeveAceitarComESemAcento(string input)
  {
    var ok = PaymentMethods.TryNormalize(input, out var normalized);
    Assert.True(ok);
    Assert.Equal(PaymentMethods.Cartao, normalized);
  }

  [Theory]
  [InlineData("Débito")]
  [InlineData("debito")]
  [InlineData("DEBITO")]
  public void TryNormalize_Debito_DeveAceitarComESemAcento(string input)
  {
    var ok = PaymentMethods.TryNormalize(input, out var normalized);
    Assert.True(ok);
    Assert.Equal(PaymentMethods.Debito, normalized);
  }

  [Theory]
  [InlineData("Dinheiro")]
  [InlineData("dinheiro")]
  [InlineData("DINHEIRO")]
  public void TryNormalize_Dinheiro_DeveAceitarVariacoesDeCaixa(string input)
  {
    var ok = PaymentMethods.TryNormalize(input, out var normalized);
    Assert.True(ok);
    Assert.Equal(PaymentMethods.Dinheiro, normalized);
  }

  [Theory]
  [InlineData("Crediário")]
  [InlineData("crediario")]
  [InlineData("CREDIARIO")]
  [InlineData("  Crediário  ")]
  public void TryNormalize_Crediario_DeveAceitarComESemAcento(string input)
  {
    var ok = PaymentMethods.TryNormalize(input, out var normalized);
    Assert.True(ok);
    Assert.Equal(PaymentMethods.Crediario, normalized);
  }

  // ---------- Casos inválidos ----------

  [Theory]
  [InlineData(null)]
  [InlineData("")]
  [InlineData("   ")]
  public void TryNormalize_NuloOuVazio_DeveRetornarFalse(string? input)
  {
    var ok = PaymentMethods.TryNormalize(input, out var normalized);
    Assert.False(ok);
    Assert.Equal(string.Empty, normalized);
  }

  [Theory]
  [InlineData("Boleto")]
  [InlineData("Cheque")]
  [InlineData("Pixx")]
  [InlineData("Cartão de Crédito")]
  [InlineData("123")]
  public void TryNormalize_ValorForaDaWhitelist_DeveRetornarFalse(string input)
  {
    var ok = PaymentMethods.TryNormalize(input, out var normalized);
    Assert.False(ok);
    Assert.Equal(string.Empty, normalized);
  }

  // ---------- Normalização canônica ----------

  [Fact]
  public void TryNormalize_DeveSempreRetornarTextoCanonicoComAcento()
  {
    PaymentMethods.TryNormalize("cartao", out var cartao);
    PaymentMethods.TryNormalize("debito", out var debito);
    PaymentMethods.TryNormalize("crediario", out var crediario);

    Assert.Equal("Cartão", cartao);
    Assert.Equal("Débito", debito);
    Assert.Equal("Crediário", crediario);
  }
}
