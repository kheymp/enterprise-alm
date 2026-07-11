namespace Enterprise.ALM.Application.DTOs.Asset;

public class AssetDetailResponseDto
{
    public AssetResponseDto Asset { get; set; } = null!;
    public decimal CalculatedCurrentValue { get; set; }
    public List<MaintenanceRecordDto> MaintenanceRecords { get; set; } = new();
}

public class MaintenanceRecordDto
{
    public int Id { get; set; }
    public DateTime DatePerformed { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Cost { get; set; }
}
