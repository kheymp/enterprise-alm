namespace Enterprise.ALM.Domain.Entities;

public class LicenseAllocation
{
    public int Id { get; set; }
    public int SoftwareLicenseId {get; set;} // Foreign key to software license
    public int UserId { get; set; } // Foreign key to user
    public DateTime AssignedDate { get; set; }
    public SoftwareLicense? SoftwareLicense { get; set; }
    public User? User { get; set; }
}