using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ModaLink.Api.Models;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // 🔐 REGISTER
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(x => x.Email == dto.Email))
            return BadRequest("Email já registrado");

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Usuário registrado com sucesso"
        });
    }

    // 🔐 LOGIN
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == dto.Email);

        if (user == null)
            return BadRequest(new { message ="Usuário não encontrado"});

        var senhaValida = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

        if (!senhaValida)
            return BadRequest(new { message = "Email ou senha inválidos"});

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            token = token,
            user = new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name
            }
        });
    }

    // 🔐 GERAR TOKEN JWT
    private string GenerateJwtToken(User user)
    {
        var key = Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? throw new Exception("JWT Key não configurada")
        );

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256
        );

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}