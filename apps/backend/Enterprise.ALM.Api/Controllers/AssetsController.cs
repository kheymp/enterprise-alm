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
    [Authorize(Roles = "Admin,Manager,Viewer")]
    public async Task<IActionResult> GetAllAssets()
    {
        var assets = await _assetService.GetAllAssetsAsync();
        return Ok(assets);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetDto dto)
    {
        var result = await _assetService.CreateAssetAsync(dto);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Manager,Viewer")]
    public async Task<IActionResult> GetAssetDetails(int id)
    {
        var result = await _assetService.GetAssetDetailsAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("{id}/maintenance")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AddMaintenance(int id, [FromBody] CreateMaintenanceRecordDto dto)
    {
        var result = await _assetService.AddMaintenanceRecordAsync(id, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteAsset(int id)
    {
        var deleted = await _assetService.DeleteAssetAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateAsset(int id, [FromBody] UpdateAssetDto dto)
    {
        var result = await _assetService.UpdateAssetAsync(id, dto);
        if (result == null) return NotFound();
        return Ok(result);
    }
}