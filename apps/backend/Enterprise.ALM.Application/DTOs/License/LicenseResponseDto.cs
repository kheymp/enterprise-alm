namespace Enterprise.ALM.Application.DTOs.License;

public class LicenseResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public decimal CostPerSeat { get; set; }
    public DateTime RenewalDate { get; set; }
    public bool IsActive { get; set; }
    public int AllocatedSeats { get; set; }
    public List<LicenseAllocationDto> Allocations { get; set; } = new();
}
