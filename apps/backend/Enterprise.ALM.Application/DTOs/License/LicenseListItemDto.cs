namespace Enterprise.ALM.Application.DTOs.License;

/// <summary>
/// The list view's shape: license fields plus a seat count. Deliberately omits the
/// allocation rows — those are only needed by the detail endpoint, and including
/// them here meant returning one row per allocation for every license.
/// </summary>
public class LicenseListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public decimal CostPerSeat { get; set; }
    public DateTime RenewalDate { get; set; }
    public bool IsActive { get; set; }
    public int AllocatedSeats { get; set; }
}
