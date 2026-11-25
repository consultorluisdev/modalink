using Xunit;

namespace ModaLink.Tests.DTOs;

public class PayInstallmentDtoTests
{
  [Fact]
  public void PayInstallmentDto_SemAnotacoes_DevePermitirTudoNulo()
  {
    var dto = new PayInstallmentDto();

    Assert.Null(dto.Amount);
    Assert.Null(dto.Method);
  }

  [Fact]
  public void PayInstallmentDto_ComValores_DeveArmazenar()
  {
    var dto = new PayInstallmentDto { Amount = 50m, Method = "Pix" };

    Assert.Equal(50m, dto.Amount);
    Assert.Equal("Pix", dto.Method);
  }
}
