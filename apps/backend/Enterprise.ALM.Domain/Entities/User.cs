namespace Enterprise.ALM.Domain.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string Department { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public bool MustChangePassword { get; set; } = false;

        public int RoleId { get; set; }
        public Role? Role { get; set; } = null!;

        public ICollection<LicenseAllocation> LicenseAllocations { get; set; } = new List<LicenseAllocation>();
    }
}