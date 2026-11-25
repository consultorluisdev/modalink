using ModaLink.Api.Common;
using Xunit;

namespace ModaLink.Tests.Common;

public class OrderStatusesTests
{
  [Fact]
  public void Pending_DeveSerStringPending()
  {
    Assert.Equal("Pending", OrderStatuses.Pending);
  }

  [Fact]
  public void Paid_DeveSerStringPaid()
  {
    Assert.Equal("Paid", OrderStatuses.Paid);
  }

  [Fact]
  public void Cancelled_DeveSerStringCancelled()
  {
    Assert.Equal("Cancelled", OrderStatuses.Cancelled);
  }

  [Fact]
  public void Constantes_DevemSerDistintas()
  {
    Assert.NotEqual(OrderStatuses.Pending, OrderStatuses.Paid);
    Assert.NotEqual(OrderStatuses.Pending, OrderStatuses.Cancelled);
    Assert.NotEqual(OrderStatuses.Paid, OrderStatuses.Cancelled);
  }
}
