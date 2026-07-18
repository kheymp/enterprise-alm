using Enterprise.ALM.Application.DTOs.Audit;

namespace Enterprise.ALM.Application.Interfaces;

public interface IAuditLogService
{
    Task<List<AuditLogResponseDto>> GetAuditLogsAsync(
        string? entityName = null,
        string? entityId = null,
        int page = 1,
        int pageSize = 50);
}
