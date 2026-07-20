using Enterprise.ALM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Enterprise.ALM.Infrastructure.BackgroundJobs;

/// <summary>
/// Keeps the public demo self-healing. On startup, then once an hour, it wipes anything a
/// visitor changed, re-creates the demo admin account, and re-seeds a small baseline so every
/// visitor arrives at the same clean, populated app.
/// </summary>
public class DemoResetJob : BackgroundService
{
    // The credentials the login-page button will use. Public on purpose.
    public const string DemoEmail = "demo@enterprise-alm.app";
    public const string DemoPassword = "Demo!2026";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DemoResetJob> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(1);

    public DemoResetJob(IServiceScopeFactory scopeFactory, ILogger<DemoResetJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    // Runs once immediately when the app starts, then loops every hour.
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ResetDemoDataAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while resetting demo data.");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task ResetDemoDataAsync()
    {
        // A BackgroundService lives forever, but ApplicationDbContext is scoped (per-request),
        // so we open a short-lived scope to borrow one — exactly like LicenseExpirationJob does.
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // 1) Wipe everything a visitor can touch.
        //    ExecuteDeleteAsync runs a direct SQL DELETE. That matters here because your
        //    ApplicationDbContext.SaveChangesAsync writes an audit-log row for every change —
        //    ExecuteDeleteAsync skips that, so we don't flood the audit log with "Deleted" rows.
        //    Delete CHILD tables before PARENT tables so foreign keys don't complain.
        await db.LicenseAllocations.ExecuteDeleteAsync();
        await db.MaintenanceRecords.ExecuteDeleteAsync();
        await db.SoftwareLicenses.ExecuteDeleteAsync();
        await db.Assets.ExecuteDeleteAsync();
        await db.Users.Where(u => u.Email != DemoEmail).ExecuteDeleteAsync(); // keep only the demo admin

        // 2) Make sure the demo admin exists with the right password.
        //    RoleId 1 = Admin (see ApplicationDbContext.OnModelCreating role seeding).
        //    This also RECOVERS the account if a visitor deleted it or changed its password.
        var demoAdmin = await db.Users.FirstOrDefaultAsync(u => u.Email == DemoEmail);
        if (demoAdmin == null)
        {
            demoAdmin = new User { Email = DemoEmail, Username = "demo-admin", Department = "Demo" };
            db.Users.Add(demoAdmin);
        }
        demoAdmin.RoleId = 1;
        demoAdmin.IsActive = true;
        demoAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword);

        // 3) A couple of sample teammates so the User Management screen looks populated.
        //    They can't be logged into; the random hash just makes login safely return "no".
        db.Users.AddRange(
            new User { Email = "jane.manager@example.com", Username = "jane.manager", Department = "IT",
                       RoleId = 2, IsActive = true, PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()) },
            new User { Email = "sam.viewer@example.com", Username = "sam.viewer", Department = "Finance",
                       RoleId = 3, IsActive = true, PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()) }
        );

        await db.SaveChangesAsync(); // saves users; demoAdmin.Id is now filled in

        // 4) Baseline assets + licenses so the dashboard isn't empty.
        db.Assets.AddRange(
            new Asset { Name = "MacBook Pro 16\"", SerialNumber = "DEMO-MBP-001",
                        PurchaseDate = DateTime.UtcNow.AddMonths(-8), IsActive = true,
                        PurchasePrice = 2499m, ExpectedLifespanMonths = 48, SalvageValue = 300m,
                        AssignedUserId = demoAdmin.Id },
            new Asset { Name = "Dell UltraSharp Monitor", SerialNumber = "DEMO-MON-014",
                        PurchaseDate = DateTime.UtcNow.AddMonths(-14), IsActive = true,
                        PurchasePrice = 650m, ExpectedLifespanMonths = 60, SalvageValue = 50m },
            new Asset { Name = "iPhone 15", SerialNumber = "DEMO-PHN-101",
                        PurchaseDate = DateTime.UtcNow.AddMonths(-3), IsActive = true,
                        PurchasePrice = 999m, ExpectedLifespanMonths = 36, SalvageValue = 150m }
        );

        db.SoftwareLicenses.AddRange(
            new SoftwareLicense { Name = "Microsoft 365 E3", Publisher = "Microsoft", TotalSeats = 50,
                                  CostPerSeat = 36m, RenewalDate = DateTime.UtcNow.AddMonths(9), IsActive = true },
            new SoftwareLicense { Name = "Adobe Creative Cloud", Publisher = "Adobe", TotalSeats = 10,
                                  CostPerSeat = 60m, RenewalDate = DateTime.UtcNow.AddMonths(4), IsActive = true }
        );

        await db.SaveChangesAsync();

        // 5) Start the audit trail clean — remove the "Created" rows that step 4 just generated.
        await db.AuditLogs.ExecuteDeleteAsync();

        _logger.LogInformation("Demo data reset complete.");
    }
}