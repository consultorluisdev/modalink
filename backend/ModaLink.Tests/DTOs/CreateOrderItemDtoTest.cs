using System.ComponentModel.DataAnnotations;
using Xunit;

namespace ModaLink.Tests.DTOs;

public class CreateOrderItemDtoTests
{
  private static (bool IsValid, List<ValidationResult> Results) Validate(object model)
  {
    var results = new List<ValidationResult>();
    var context = new ValidationContext(model);
    var ok = Validator.TryValidateObject(model, context, results, validateAllProperties: true);
    return (ok, results);
  }

  [Theory]
  [InlineData(0)]
  [InlineData(-1)]
  public void ProductId_MenorQue1_DeveSerInvalido(int id)
  {
    var item = new CreateOrderItemDto { ProductId = id, Quantity = 1 };

    var (ok, results) = Validate(item);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderItemDto.ProductId)));
  }

  [Theory]
  [InlineData(0)]
  [InlineData(-1)]
  public void Quantity_MenorQue1_DeveSerInvalido(int qty)
  {
    var item = new CreateOrderItemDto { ProductId = 1, Quantity = qty };

    var (ok, results) = Validate(item);

    Assert.False(ok);
    Assert.Contains(results, r => r.MemberNames.Contains(nameof(CreateOrderItemDto.Quantity)));
  }

  [Fact]
  public void Item_Valido_DevePassar()
  {
    var item = new CreateOrderItemDto { ProductId = 1, Quantity = 2, UnitPrice = 50m };

    var (ok, _) = Validate(item);

    Assert.True(ok);
  }
}
