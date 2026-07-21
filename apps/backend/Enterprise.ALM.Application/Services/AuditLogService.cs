using Enterprise.ALM.Application.DTOs.Audit;
using Enterprise.ALM.Application.Interfaces;

namespace Enterprise.ALM.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task<List<AuditLogResponseDto>> GetAuditLogsAsync(
        string? entityName = null,
        string? entityId = null,
        int page = 1,
        int pageSize = 50)
    {
        var logs = await _auditLogRepository.GetAuditLogsAsync(entityName, entityId, page, pageSize);

        return logs.Select(log => new AuditLogResponseDto
        {
            Id = log.Id,
            EntityName = log.EntityName,
            EntityId = log.EntityId,
            Action = log.Action,
            OldValues = log.OldValues,
            NewValues = log.NewValues,
            ChangedColumns = log.ChangedColumns,
            PerformedBy = log.PerformedBy,
            Timestamp = DateTime.SpecifyKind(log.Timestamp, DateTimeKind.Utc)
        }).ToList();
    }
}
