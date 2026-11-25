using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace ModaLink.Api.Data;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var databaseUrl = configuration["DATABASE_URL"];

        if (string.IsNullOrWhiteSpace(connectionString) && !string.IsNullOrWhiteSpace(databaseUrl))
        {
            if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != "postgres" && uri.Scheme != "postgresql"))
            {
                throw new InvalidOperationException("DATABASE_URL deve ser uma URL PostgreSQL válida.");
            }

            var credentials = uri.UserInfo.Split(':', 2);
            if (credentials.Length != 2)
            {
                throw new InvalidOperationException("DATABASE_URL precisa conter usuário e senha.");
            }

            connectionString = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.IsDefaultPort ? 5432 : uri.Port,
                Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
                Username = Uri.UnescapeDataString(credentials[0]),
                Password = Uri.UnescapeDataString(credentials[1]),
                SslMode = SslMode.Require
            }.ConnectionString;
        }

        connectionString ??= "Host=localhost;Database=modalink_design;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AppDbContext(options);
    }
}
