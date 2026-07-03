using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;

[ApiController]
[Route("api/store-settings")]
[Authorize]
public class StoreSettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public StoreSettingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await _context.StoreSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new StoreSetting
            {
                StoreName = "Minha Loja",
                UpdatedAt = DateTime.UtcNow
            };
            _context.StoreSettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        return Ok(settings);
    }

    [HttpPut]
    public async Task<IActionResult> Update(StoreSetting dto)
    {
        var settings = await _context.StoreSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new StoreSetting
            {
                StoreName = dto.StoreName,
                Phone = dto.Phone,
                Address = dto.Address,
                LogoUrl = dto.LogoUrl,
                UpdatedAt = DateTime.UtcNow
            };
            _context.StoreSettings.Add(settings);
        }
        else
        {
            settings.StoreName = dto.StoreName;
            settings.Phone = dto.Phone;
            settings.Address = dto.Address;
            settings.LogoUrl = dto.LogoUrl;
            settings.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(settings);
    }
}
