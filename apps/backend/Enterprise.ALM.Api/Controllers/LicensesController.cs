using Enterprise.ALM.Domain.Entities;
using Enterprise.ALM.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enterprise.ALM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LicensesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public LicensesController(ApplicationDbContext context) {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllLicenses([FromQuery] bool showInactive = false) {
        var roleId = User.FindFirst("RoleId")?.Value;

        if (roleId != "1" && roleId != "2" && roleId != "3") {
            return Forbid();
        }

        var licenses = await _context.SoftwareLicenses
            .Where(sl => sl.IsActive || showInactive)
            .Include(sl => sl.Allocations)
            .ToListAsync();
        
        return Ok(licenses);
    }

    [HttpPost]
    public async Task<IActionResult> CreateLicense([FromBody] SoftwareLicense newSoftwareLicense) {
        var roleId = User.FindFirst("RoleId")?.Value;

        if (roleId != "1" && roleId != "2") {
            return Forbid();
        }

        _context.SoftwareLicenses.Add(newSoftwareLicense);
        await _context.SaveChangesAsync();
        return Ok(newSoftwareLicense);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLicense(int id,[FromBody] SoftwareLicense updatedSoftwareLicense) {
        var roleId = User.FindFirst("RoleId")?.Value;

        if (roleId != "1" && roleId != "2") {
            return Forbid();
        }

        var softwareLicense = await _context.SoftwareLicenses.FindAsync(id);
        if (softwareLicense == null) return NotFound();

        softwareLicense.Name = updatedSoftwareLicense.Name;
        softwareLicense.Publisher = updatedSoftwareLicense.Publisher;
        softwareLicense.TotalSeats = updatedSoftwareLicense.TotalSeats;
        softwareLicense.CostPerSeat = updatedSoftwareLicense.CostPerSeat;
        softwareLicense.RenewalDate = updatedSoftwareLicense.RenewalDate;
        softwareLicense.IsActive = updatedSoftwareLicense.IsActive;

        await _context.SaveChangesAsync();

        return Ok(softwareLicense);
    }

    [HttpPost("{id}/allocate")]

    public async Task<IActionResult> AllocationLicense(int id,[FromBody] LicenseAllocation newAllocation) {
        var roleId = User.FindFirst("RoleId")?.Value;

        if (roleId != "1" && roleId != "2") {
            return Forbid();
        }

        var softwareLicense = await _context.SoftwareLicenses.FindAsync(id);
        if (softwareLicense == null) return NotFound();
        var currentUsedSeats = await _context.LicenseAllocations.CountAsync(la => la.SoftwareLicenseId == id);

        if (currentUsedSeats >= softwareLicense.TotalSeats) {
            return BadRequest("No available seats left.");
        }

        var alreadyAllocated = await _context.LicenseAllocations
            .AnyAsync(la => la.SoftwareLicenseId == id && la.UserId == newAllocation.UserId);

        if (alreadyAllocated) {
            return BadRequest("This user already has a seat assigned for this software license.");
        }

        newAllocation.SoftwareLicenseId = id;
        newAllocation.AssignedDate = DateTime.UtcNow;

        _context.LicenseAllocations.Add(newAllocation);
        await _context.SaveChangesAsync();

        return Ok(newAllocation);
    }

    [HttpDelete("{id}/allocate/{userId}")]
    public async Task<IActionResult> RemoveAllocation(int id, int userId) {
        var roleId = User.FindFirst("RoleId")?.Value;

        if (roleId != "1" && roleId != "2") return Forbid();

        var allocation = await _context.LicenseAllocations
            .FirstOrDefaultAsync(la => la.SoftwareLicenseId == id && la.UserId == userId);
            
        if (allocation == null) return NotFound();

        _context.LicenseAllocations.Remove(allocation);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLicense(int id) {
        var roleId = User.FindFirst("RoleId")?.Value;

        if (roleId != "1" && roleId != "2") return Forbid();

        var softwareLicense = await _context.SoftwareLicenses.FindAsync(id);
        if (softwareLicense == null) return NotFound();

        softwareLicense.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok();

    }

    

    
}