using Microsoft.EntityFrameworkCore;
using ModaLink.Api.Models;


namespace ModaLink.Api.Models;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    
}