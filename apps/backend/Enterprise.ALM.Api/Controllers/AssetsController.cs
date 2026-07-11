using Enterprise.ALM.Application.DTOs.Asset;
using Enterprise.ALM.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Enterprise.ALM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]

public class AssetsController : ControllerBase
{
    private readonly IAssetService _assetService;

    public AssetsController(IAssetService assetService)
    {
        _assetService = assetService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAssets()
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2" && roleId != "3") return Forbid();
        var assets = await _assetService.GetAllAssetsAsync();
        return Ok(assets);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var result = await _assetService.CreateAssetAsync(dto);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssetDetails(int id)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2" && roleId != "3") return Forbid();
        var result = await _assetService.GetAssetDetailsAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("{id}/maintenance")]
    public async Task<IActionResult> AddMaintenance(int id, [FromBody] CreateMaintenanceRecordDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var result = await _assetService.AddMaintenanceRecordAsync(id, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsset(int id)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1") return Forbid();
        var deleted = await _assetService.DeleteAssetAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsset(int id, [FromBody] UpdateAssetDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1" && roleId != "2") return Forbid();
        var result = await _assetService.UpdateAssetAsync(id, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }
}