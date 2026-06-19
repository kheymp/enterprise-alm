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
}