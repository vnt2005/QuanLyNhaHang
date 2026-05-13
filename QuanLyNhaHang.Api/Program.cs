using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Infrastructure.Persistence;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// ============================
// Database
// ============================
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"));
});

// Đăng ký interface cho Application Layer dùng
builder.Services.AddScoped<IApplicationDbContext>(provider =>
    provider.GetRequiredService<ApplicationDbContext>());

// ============================
// MediatR
// ============================
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(
        Assembly.Load("QuanLyNhaHang.Application"));
});

// ============================
// Controllers + OpenAPI
// ============================
builder.Services.AddControllers();

builder.Services.AddOpenApi();

var app = builder.Build();

// ============================
// HTTP request pipeline
// ============================
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();