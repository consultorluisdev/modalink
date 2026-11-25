using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ModaLink.Tests.Helpers;

public static class FakeUserHelper
{
  public const int DefaultUserId = 42;
  public const string DefaultRole = "Administrador";

  public static ClaimsPrincipal CreatePrincipal(int userId = DefaultUserId, string role = DefaultRole)
  {
    var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, "test-user"),
            new(ClaimTypes.Role, role)
        };

    return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
  }

  public static void AttachUser(ControllerBase controller, int userId = DefaultUserId, string role = DefaultRole)
  {
    controller.ControllerContext = new ControllerContext
    {
      HttpContext = new DefaultHttpContext
      {
        User = CreatePrincipal(userId, role)
      }
    };
  }
}
