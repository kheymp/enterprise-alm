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
    public async Task<IActionResult> GetAllLicenses([FromQuery] bool showInactive = false)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2" && roleId != "3") return Forbid();

        var licenses = await _licenseService.GetAllLicensesAsync(showInactive);
        return Ok(licenses);
    }

    [HttpPost]
    public async Task<IActionResult> CreateLicense([FromBody] CreateLicenseDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var result = await _licenseService.CreateLicenseAsync(dto);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLicense(int id, [FromBody] UpdateLicenseDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var result = await _licenseService.UpdateLicenseAsync(id, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("{id}/allocate")]
    public async Task<IActionResult> AllocateLicense(int id, [FromBody] AllocateLicenseDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var (success, error) = await _licenseService.AllocateLicenseAsync(id, dto);
        if (!success) return BadRequest(error);
        return Ok();
    }

    [HttpDelete("{id}/allocate/{userId}")]
    public async Task<IActionResult> RemoveAllocation(int id, int userId)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var removed = await _licenseService.RemoveAllocationAsync(id, userId);
        if (!removed) return NotFound();
        return NoContent();
    }
    
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLicense(int id)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var deleted = await _licenseService.DeleteLicenseAsync(id);
        if (!deleted) return NotFound();
        return Ok();
    }
    
}