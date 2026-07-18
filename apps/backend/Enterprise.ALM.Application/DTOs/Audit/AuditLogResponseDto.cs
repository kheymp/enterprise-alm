namespace Enterprise.ALM.Application.DTOs.Audit;

public class AuditLogResponseDto
{
    public long Id { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? ChangedColumns { get; set; }
    public string? PerformedBy { get; set; }
    public DateTime Timestamp { get; set; }
}
