using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Interfaces;

public interface IAuditLogRepository
{
    Task<List<AuditLog>> GetAuditLogsAsync(
        string? entityName = null,
        string? entityId = null,
        int page = 1,
        int pageSize = 50);
}
