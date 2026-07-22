using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;

namespace QuanLyNhaHang.IntegrationTests.Infrastructure;

public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName =
        $"QuanLyNhaHang.IntegrationTests-{Guid.NewGuid():N}";

    public FakeEmailService EmailService { get; } = new();

    public FakeAuthSessionService AuthSessionService { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] =
                        "Server=localhost;Database=Tests;User Id=sa;" +
                        "Password=NeverUsed123!;TrustServerCertificate=True",
                    ["Jwt:SecretKey"] =
                        "integration-tests-only-secret-key-0123456789-abcdef",
                    ["Jwt:Issuer"] = "QuanLyNhaHang.IntegrationTests",
                    ["Jwt:Audience"] = "QuanLyNhaHang.IntegrationTests",
                    ["Jwt:ExpiresInMinutes"] = "30",
                    ["Auth:RefreshTokenDays"] = "30"
                });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<
                IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.RemoveAll<IApplicationDbContext>();

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));

            services.AddScoped<IApplicationDbContext>(provider =>
                provider.GetRequiredService<ApplicationDbContext>());

            services.RemoveAll<IEmailService>();
            services.AddSingleton<IEmailService>(EmailService);

            services.RemoveAll<IAuthSessionService>();
            services.AddSingleton<IAuthSessionService>(AuthSessionService);
        });
    }

    public HttpClient CreateHttpsClient()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });
    }

    public async Task<Guid> SeedUserAsync(
        string email,
        string password,
        bool enableTwoFactor = false,
        bool active = true,
        string role = "Admin")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher>();

        await context.Database.EnsureCreatedAsync();

        var user = new User(
            "Integration",
            "Tester",
            email,
            $"09{Random.Shared.Next(10000000, 99999999)}",
            passwordHasher.HashPassword(password),
            role);

        user.MarkEmailVerified();

        if (enableTwoFactor)
        {
            user.EnableTwoFactor();
        }

        if (!active)
        {
            user.Deactivate();
        }

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return user.Id;
    }

    public async Task<User> GetUserAsync(Guid userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        return await context.Users
            .AsNoTracking()
            .SingleAsync(user => user.Id == userId);
    }

    public bool VerifyHash(string value, string hash)
    {
        using var scope = Services.CreateScope();
        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher>();

        return passwordHasher.VerifyPassword(value, hash);
    }
}
