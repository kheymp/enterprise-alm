using Enterprise.ALM.Application.DTOs.License;
using Enterprise.ALM.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Enterprise.ALM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]

public class LicensesController : ControllerBase
{
    private readonly ILicenseService _licenseService;

    public LicensesController(ILicenseService licenseService) {
        _licenseService = licenseService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager,Viewer")]
    public async Task<IActionResult> GetAllLicenses([FromQuery] bool showInactive = false)
    {
        var licenses = await _licenseService.GetAllLicensesAsync(showInactive);
        return Ok(licenses);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> CreateLicense([FromBody] CreateLicenseDto dto)
    {
        var result = await _licenseService.CreateLicenseAsync(dto);
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateLicense(int id, [FromBody] UpdateLicenseDto dto)
    {
        var result = await _licenseService.UpdateLicenseAsync(id, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("{id}/allocate")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AllocateLicense(int id, [FromBody] AllocateLicenseDto dto)
    {
        var (success, error) = await _licenseService.AllocateLicenseAsync(id, dto);
        if (!success) return BadRequest(error);
        return Ok();
    }

    [HttpDelete("{id}/allocate/{userId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> RemoveAllocation(int id, int userId)
    {
        var removed = await _licenseService.RemoveAllocationAsync(id, userId);
        if (!removed) return NotFound();
        return NoContent();
    }
    
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> DeleteLicense(int id)
    {
        var deleted = await _licenseService.DeleteLicenseAsync(id);
        if (!deleted) return NotFound();
        return Ok();
    }
    
}