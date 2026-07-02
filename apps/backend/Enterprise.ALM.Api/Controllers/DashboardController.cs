using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Enterprise.ALM.Infrastructure;
using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] 

public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DashboardController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        // Role Checking
        var roleId = User.FindFirst("RoleId")?.Value;
        bool isViewer = roleId == "3";

        // Hardware Asset Calculations
        var totalAssets = await _context.Assets.CountAsync(a => a.IsActive);

        // Sum of PurchasePrice
        var totalAssetValue = await _context.Assets
            .Where( a => a.IsActive)
            .SumAsync(a => (decimal?)a.PurchasePrice ?? 0);
        
        var assignedAssets = await _context.Assets
            .CountAsync(a => a.IsActive && a.AssignedUserId != null);
        
        var unassignedAssets = totalAssets - assignedAssets;

        // Software Licence Calculations
        var totalLicenses = await _context.SoftwareLicenses
            .CountAsync(sl => sl.IsActive);
        
        var totalLicenseCost = await _context.SoftwareLicenses
            .Where(sl => sl.IsActive)
            .SumAsync(sl => (decimal?)(sl.CostPerSeat * sl.TotalSeats));

        var totalSeatsOwned = await _context.SoftwareLicenses
            .Where(sl => sl.IsActive)
            .SumAsync(sl => (int?)sl.TotalSeats) ?? 0;

        var totalSeatsUsed = await _context.LicenseAllocations
            .Where(la => la.SoftwareLicense.IsActive)
            .CountAsync();

        // Proactive Alerts
        var thirtyDaysFromNow = DateTime.UtcNow.AddDays(30);

        var expiringLicensesData = await _context.SoftwareLicenses
            .Where(sl => sl.IsActive && sl.RenewalDate <= thirtyDaysFromNow)
            .Select(sl => new ExpiringLicense {
                Name = sl.Name,
                RenewalDate = sl.RenewalDate,
                DaysRemaining = (sl.RenewalDate - DateTime.UtcNow).Days
            })
            .ToListAsync();

        var summary = new DashboardSummary
        {
            TotalAssets = totalAssets,
            // SECURITY: If they are a Viewer, hide the dollar values by setting them to null!
            TotalAssetValue = isViewer ? null : totalAssetValue,
            TotalLicenses = totalLicenses,
            TotalLicenseCost = isViewer ? null : totalLicenseCost,
            
            AssignedAssets = assignedAssets,
            UnassignedAssets = unassignedAssets,
            TotalSeatsOwned = totalSeatsOwned,
            TotalSeatsUsed = totalSeatsUsed,
            
            ExpiringLicensesCount = expiringLicensesData.Count,
            ExpiringLicenses = expiringLicensesData
        };
        return Ok(summary);

    }
}