using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModaLink.Api.Data;
using ModaLink.Api.Models;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get()
    {
        var products = await _context.Products.ToListAsync();
        return Ok(products);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromForm] ProductCreateDto dto)
    {
        string? imageUrl = null;

        if (dto.Image != null)
        {
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads");
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var filename = Guid.NewGuid().ToString() + Path.GetExtension(dto.Image.FileName);
            var path = Path.Combine(folder, filename);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await dto.Image.CopyToAsync(stream);
            }

            imageUrl = "/uploads/" + filename;
        }

        var product = new Product
        {
            Title = dto.Title,
            Description = dto.Description,
            Price = dto.Price,
            Category = dto.Category,
            Stock = dto.Stock,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return Ok(product);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound(new { message = "Produto nao encontrado" });
        return Ok(product);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromForm] ProductCreateDto dto)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound(new { message = "Produto nao encontrado" });

        product.Title = dto.Title;
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.Category = dto.Category;
        product.Stock = dto.Stock;
        product.UpdatedAt = DateTime.UtcNow;

        if (dto.Image != null)
        {
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads");
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var filename = Guid.NewGuid().ToString() + Path.GetExtension(dto.Image.FileName);
            var path = Path.Combine(folder, filename);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await dto.Image.CopyToAsync(stream);
            }

            product.ImageUrl = "/uploads/" + filename;
        }

        await _context.SaveChangesAsync();
        return Ok(product);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound(new { message = "Produto nao encontrado" });

        var hasSales = await _context.OrderItems.AnyAsync(i => i.ProductId == id);
        if (hasSales)
            return Conflict(new { message = "Produto possui vendas e nao pode ser excluido" });

        _context.Products.Remove(product);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Produto possui historico de vendas e nao pode ser excluido" });
        }

        return Ok(new { message = "Produto removido" });
    }
}
