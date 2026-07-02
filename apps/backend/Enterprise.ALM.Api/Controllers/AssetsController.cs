using Enterprise.ALM.Domain.Entities;
using Enterprise.ALM.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enterprise.ALM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]

public class AssetsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AssetsController(ApplicationDbContext context) {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAssets()
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2" && roleId != "3") 
        {
            return Forbid();
        }

        var assets = await _context.Assets
            .Include(a => a.AssignedUser)
            .ToListAsync();
        return Ok(assets);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsset([FromBody] Asset newAsset)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2")
        {
            return Forbid();
        }

        _context.Assets.Add(newAsset);
        await _context.SaveChangesAsync();
        return Ok(newAsset);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssetDetails(int id)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2" && roleId != "3") 
        {
            return Forbid();
        }
        
        var asset = await _context.Assets
            .Include(a => a.AssignedUser)
            .Include(a => a.MaintenanceRecords) 
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asset == null) return NotFound();

        var monthsOwned = ((DateTime.Now.Year - asset.PurchaseDate.Year) * 12) + DateTime.Now.Month - asset.PurchaseDate.Month;
        var monthsPassed = Math.Min(monthsOwned, asset.ExpectedLifespanMonths);

        decimal monthlyDepreciation = (asset.PurchasePrice - asset.SalvageValue) / Math.Max(1, asset.ExpectedLifespanMonths);
        decimal currentValue = asset.PurchasePrice - (monthlyDepreciation * monthsPassed);

        return Ok(new {
            Asset = asset,
            CalculatedCurrentValue = currentValue
        });
    }

    [HttpPost("{id}/maintenance")]
    public async Task<IActionResult> AddMaintenance(int id, [FromBody] MaintenanceRecord record)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2")
        {
            return Forbid();
        }

        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound();
        record.AssetId = id; // Ensure the foreign key is set
        _context.MaintenanceRecords.Add(record);
        await _context.SaveChangesAsync();
        return Ok(record);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsset(int id)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1")
        {
            return Forbid();
        }

        var asset = await _context.Assets.FindAsync(id);
        if (asset == null)
        {
            return NotFound();
        }

        _context.Assets.Remove(asset);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsset(int id, [FromBody] Asset updatedAsset)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2")
        {
            return Forbid();
        }

        var asset = await _context.Assets.FindAsync(id);
        if (asset == null)
        {
            return NotFound();
        }

        asset.Name = updatedAsset.Name;
        asset.SerialNumber = updatedAsset.SerialNumber;
        asset.PurchaseDate = updatedAsset.PurchaseDate;
        asset.IsActive = updatedAsset.IsActive;
        asset.PurchasePrice = updatedAsset.PurchasePrice;
        asset.ExpectedLifespanMonths = updatedAsset.ExpectedLifespanMonths;
        asset.SalvageValue = updatedAsset.SalvageValue;
        asset.AssignedUserId = updatedAsset.AssignedUserId;

        await _context.SaveChangesAsync();

        return Ok(asset);
    }
}