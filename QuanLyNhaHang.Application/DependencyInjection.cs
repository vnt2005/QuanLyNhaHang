using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using MediatR;
using QuanLyNhaHang.Application.Common.Behaviors;
using QuanLyNhaHang.Application.Features.CustomerPayments.Services;

namespace QuanLyNhaHang.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
        });

        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(BusinessExceptionNormalizationBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ActivityLogBehavior<,>));

        services.AddScoped<CustomerPaymentAccessService>();
        services.AddScoped<CustomerPaymentQuoteService>();
        services.AddScoped<CustomerPaymentAttemptService>();

        return services;
    }
}
