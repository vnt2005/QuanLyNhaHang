namespace QuanLyNhaHang.Api.Configuration;

public static class DatabaseInitializationExtensions
{
    public static async Task InitializeDatabaseAsync(
        this WebApplication app)
    {
        var applyMigrationsOnStartup = app.Configuration.GetValue<bool>(
            "Database:ApplyMigrationsOnStartup");
        var syncPermissionCatalogOnStartup =
            app.Configuration.GetValue<bool?>(
                "Database:SyncPermissionCatalogOnStartup")
            ?? applyMigrationsOnStartup;
        var syncSystemRolesOnStartup = app.Configuration.GetValue<bool?>(
            "Database:SyncSystemRolesOnStartup")
            ?? syncPermissionCatalogOnStartup;

        if (!applyMigrationsOnStartup &&
            !syncPermissionCatalogOnStartup &&
            !syncSystemRolesOnStartup)
        {
            return;
        }

        using var scope = app.Services.CreateScope();

        if (applyMigrationsOnStartup)
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            await dbContext.Database.MigrateAsync();
        }

        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        if (syncPermissionCatalogOnStartup || syncSystemRolesOnStartup)
            await mediator.Send(new SyncPermissionCatalogCommand());

        if (syncSystemRolesOnStartup)
            await mediator.Send(new SyncSystemRolesCommand());
    }
}
