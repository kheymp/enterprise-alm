namespace Enterprise.ALM.Application.DTOs.Asset;

public class CreateMaintenanceRecordDto
{
    public DateTime DatePerformed { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Cost { get; set; }
}
