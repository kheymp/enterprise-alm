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
    [Authorize(Roles = "Admin,Manager,Viewer")]
    public async Task<IActionResult> GetSummary()
    {
        bool isViewer = User.IsInRole("Viewer");
        var summary = await _dashboardService.GetSummaryAsync(isViewer);
        return Ok(summary);
    }
    
}