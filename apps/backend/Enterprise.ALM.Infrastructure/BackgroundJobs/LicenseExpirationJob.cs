using Enterprise.ALM.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Enterprise.ALM.Infrastructure.BackgroundJobs;

/// <summary>
/// A background service that periodically checks for software licenses
/// whose renewal date has passed and deactivates them automatically.
/// Runs once every 24 hours.
/// </summary>
public class LicenseExpirationJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LicenseExpirationJob> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24);

    public LicenseExpirationJob(
        IServiceScopeFactory scopeFactory,
        ILogger<LicenseExpirationJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("LicenseExpirationJob started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DeactivateExpiredLicensesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while deactivating expired licenses.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("LicenseExpirationJob stopped.");
    }

    private async Task DeactivateExpiredLicensesAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var now = DateTime.UtcNow;

        // Find all active licenses whose renewal date has passed
        var expiredLicenses = await dbContext.SoftwareLicenses
            .Where(sl => sl.IsActive && sl.RenewalDate < now)
            .ToListAsync();

        if (expiredLicenses.Count == 0)
        {
            _logger.LogInformation("No expired licenses found.");
            return;
        }

        foreach (var license in expiredLicenses)
        {
            license.IsActive = false;
            _logger.LogInformation(
                "Deactivated license '{LicenseName}' (ID: {LicenseId}). Renewal date was {RenewalDate}.",
                license.Name, license.Id, license.RenewalDate);
        }

        await dbContext.SaveChangesAsync();

        _logger.LogInformation("Deactivated {Count} expired license(s).", expiredLicenses.Count);
    }
}
