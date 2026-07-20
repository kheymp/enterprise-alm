namespace Enterprise.ALM.Application.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; }
}
