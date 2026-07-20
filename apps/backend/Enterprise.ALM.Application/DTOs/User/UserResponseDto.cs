namespace Enterprise.ALM.Application.DTOs.User;

public class UserResponseDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int RoleId { get; set; }
    public string? RoleName { get; set; }
    public string? TemporaryPassword { get; set; }
}
