using QuanLyNhaHang.Application.Common.Orders;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureApiHost();

builder.Services
    .AddApiCors(builder.Configuration, builder.Environment)
    .AddApiServices(builder.Configuration)
    .AddApiHealthChecks()
    .AddApiAuthentication(builder.Configuration)
    .AddApiRateLimiting()
    .AddApiAuthorization();

builder.Services.AddSingleton<AnonymousOrderAbuseGuard>();

var app = builder.Build();

await app.InitializeDatabaseAsync();

app.UseApiPipeline();
app.MapApiEndpoints();

app.Run();

public partial class Program
{
}
