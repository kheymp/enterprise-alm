using System.ComponentModel.DataAnnotations.Schema;

namespace Enterprise.ALM.Domain.Entities;

public class MaintenanceRecord
{
    public int Id { get; set; }
    public int AssetId { get; set; }
    public DateTime DatePerformed { get; set; }
    public string Description { get; set; } = string.Empty;
    [Column(TypeName = "decimal(18,2)")]
    public decimal Cost { get; set; }

    public Asset? Asset { get; set; }

}