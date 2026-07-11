namespace Enterprise.ALM.Application.DTOs.License;

public class UpdateLicenseDto
{
    public string Name { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public decimal CostPerSeat { get; set; }
    public DateTime RenewalDate { get; set; }
    public bool IsActive { get; set; }
}
