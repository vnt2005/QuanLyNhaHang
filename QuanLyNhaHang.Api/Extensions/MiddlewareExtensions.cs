namespace QuanLyNhaHang.Api.Extensions;

public static class MiddlewareExtensions
{
    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        if (!app.Configuration.GetValue<bool>(
                "Hosting:DisableHttpsRedirection"))
        {
            app.UseHttpsRedirection();
        }

        app.UseMiddleware<ExceptionHandlingMiddleware>();
        app.UseRouting();
        app.UseCors(CorsExtensions.FrontendPolicy);
        app.UseAuthentication();
        app.UseRateLimiter();
        app.UseAuthorization();
        app.UseMiddleware<AtomicRequestMiddleware>();

        return app;
    }
}
