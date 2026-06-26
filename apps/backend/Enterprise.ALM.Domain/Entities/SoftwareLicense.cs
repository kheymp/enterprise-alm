using System.ComponentModel.DataAnnotations.Schema;

namespace Enterprise.ALM.Domain.Entities;

public class SoftwareLicense 
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Publisher {get; set;} = string.Empty;
    public int TotalSeats { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal CostPerSeat { get; set; }
    public DateTime RenewalDate { get; set;}
    public bool IsActive { get; set; }

    public ICollection<LicenseAllocation> Allocations { get; set; } = new List<LicenseAllocation>();
}