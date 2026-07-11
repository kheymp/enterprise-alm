using Enterprise.ALM.Application.DTOs.Auth;

namespace Enterprise.ALM.Application.Interfaces;

public interface IAuthService {
    Task<AuthResponseDto?> LoginAsync(LoginRequestDto dto);
    Task<bool> RegisterAsync(RegisterRequestDto dto);
}