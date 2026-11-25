using System.ComponentModel.DataAnnotations;
using Xunit;

namespace ModaLink.Tests.DTOs;

public class CreateOrderDtoTests
{
  private static (bool IsValid, List<ValidationResult> Results) Validate(object model)
  {
    var results = new List<ValidationResult>();
    var context = new ValidationContext(model);
    var ok = Validator.TryValidateObject(model, context, results, validateAllProperties: true);
    return (ok, results);
  }

  private static CreateOrderDto ValidDto() => new()
  {
    CustomerName = "Maria",
    PaymentMethod = "Pix",
    Discount = 0m,
    Items = new List<CreateOrderItemDto>
        {
            new() { ProductId = 1, Quantity = 1, UnitPrice = 100m }
        }
  };

  // ---------- CustomerName ----------

  [Fact]
  public void CustomerName_Vazio_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.CustomerName = "";

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.CustomerName)));
  }

  [Fact]
  public void CustomerName_Nulo_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.CustomerName = null!;

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.CustomerName)));
  }

  [Fact]
  public void CustomerName_MaiorQue200_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.CustomerName = new string('a', 201);

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.CustomerName)));
  }

  // ---------- CustomerEmail ----------

  [Fact]
  public void CustomerEmail_Invalido_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.CustomerEmail = "nao-e-email";

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.CustomerEmail)));
  }

  [Fact]
  public void CustomerEmail_Nulo_DeveSerValido()
  {
    var dto = ValidDto();
    dto.CustomerEmail = null;

    var (ok, _) = Validate(dto);

    Assert.True(ok);
  }

  // ---------- PaymentMethod ----------

  [Fact]
  public void PaymentMethod_Vazio_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.PaymentMethod = "";

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.PaymentMethod)));
  }

  [Fact]
  public void PaymentMethod_MaiorQue20_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.PaymentMethod = new string('a', 21);

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.PaymentMethod)));
  }

  // ---------- Discount ----------

  [Fact]
  public void Discount_Negativo_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.Discount = -1m;

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.Discount)));
  }

  [Fact]
  public void Discount_Zero_DeveSerValido()
  {
    var dto = ValidDto();
    dto.Discount = 0m;

    var (ok, _) = Validate(dto);

    Assert.True(ok);
  }

  // ---------- InstallmentCount ----------

  [Theory]
  [InlineData(0)]
  [InlineData(13)]
  [InlineData(-1)]
  public void InstallmentCount_ForaDoRange_DeveSerInvalido(int count)
  {
    var dto = ValidDto();
    dto.InstallmentCount = count;

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.InstallmentCount)));
  }

  [Theory]
  [InlineData(1)]
  [InlineData(6)]
  [InlineData(12)]
  public void InstallmentCount_DentroDoRange_DeveSerValido(int count)
  {
    var dto = ValidDto();
    dto.InstallmentCount = count;

    var (ok, _) = Validate(dto);

    Assert.True(ok);
  }

  [Fact]
  public void InstallmentCount_Nulo_DeveSerValido()
  {
    var dto = ValidDto();
    dto.InstallmentCount = null;

    var (ok, _) = Validate(dto);

    Assert.True(ok);
  }

  // ---------- DownPayment ----------

  [Fact]
  public void DownPayment_Negativo_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.DownPayment = -1m;

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.DownPayment)));
  }

  // ---------- InterestRate ----------

  [Fact]
  public void InterestRate_Negativo_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.InterestRate = -0.5m;

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.InterestRate)));
  }

  // ---------- Items ----------

  [Fact]
  public void Items_Vazio_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.Items = new List<CreateOrderItemDto>();

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.Items)));
  }

  [Fact]
  public void Items_Nulo_DeveSerInvalido()
  {
    var dto = ValidDto();
    dto.Items = null!;

    var (ok, results) = Validate(dto);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderDto.Items)));
  }
}
