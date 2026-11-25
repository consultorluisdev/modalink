using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Data;

namespace ModaLink.Api.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicCatalogController : ControllerBase
{
    private readonly AppDbContext _context;

    public PublicCatalogController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        [FromQuery] bool onlyInStock = true)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 48);

        var query = _context.Products
            .AsNoTracking()
            .AsQueryable();

        if (onlyInStock)
            query = query.Where(p => p.Stock > 0);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p =>
                EF.Functions.ILike(p.Title, $"%{term}%") ||
                EF.Functions.ILike(p.Description, $"%{term}%"));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var selectedCategory = category.Trim();
            query = query.Where(p => p.Category == selectedCategory);
        }

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Description,
                p.Price,
                p.ImageUrl,
                p.Category,
                p.Stock
            })
            .ToListAsync();

        var categories = await _context.Products
            .AsNoTracking()
            .Where(p => p.Category != null && p.Category != "")
            .Select(p => p.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize),
            categories
        });
    }

    [HttpGet("products/{id:int}")]
    public async Task<IActionResult> GetProduct(int id)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Description,
                p.Price,
                p.ImageUrl,
                p.Category,
                p.Stock
            })
            .FirstOrDefaultAsync();

        if (product is null)
            return NotFound(new { message = "Produto não encontrado" });

        return Ok(product);
    }

    [HttpGet("store-settings")]
    public async Task<IActionResult> GetStoreSettings()
    {
        var settings = await _context.StoreSettings
            .AsNoTracking()
            .FirstOrDefaultAsync();

        return Ok(new
        {
            storeName = settings?.StoreName ?? "Minha Loja",
            phone = settings?.Phone,
            address = settings?.Address,
            logoUrl = settings?.LogoUrl
        });
    }
}
