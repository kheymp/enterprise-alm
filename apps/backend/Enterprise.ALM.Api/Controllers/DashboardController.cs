using Enterprise.ALM.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Enterprise.ALM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] 

public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService) {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        // Role Checking
        var roleId = User.FindFirst("RoleId")?.Value;
        bool isViewer = roleId == "3";

        var summary = await _dashboardService.GetSummaryAsync(isViewer);
        return Ok(summary);
    }
    
}