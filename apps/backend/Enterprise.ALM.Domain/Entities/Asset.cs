using System.ComponentModel.DataAnnotations.Schema;

namespace Enterprise.ALM.Domain.Entities;

public class Asset
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; }
    public bool IsActive { get; set; }

    public int? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal PurchasePrice { get; set; }
    public int ExpectedLifespanMonths { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal SalvageValue { get; set; }

    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();

}
