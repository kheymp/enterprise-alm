namespace Enterprise.ALM.Application.DTOs.Asset;

public class CreateAssetDto
{
    public string Name { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; }
    public bool IsActive { get; set; }
    public decimal PurchasePrice { get; set; }
    public int ExpectedLifespanMonths { get; set; }
    public decimal SalvageValue { get; set; }
    public int? AssignedUserId { get; set; }
}