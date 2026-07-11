using Enterprise.ALM.Application.DTOs.Dashboard;

namespace Enterprise.ALM.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(bool isViewer);
}
