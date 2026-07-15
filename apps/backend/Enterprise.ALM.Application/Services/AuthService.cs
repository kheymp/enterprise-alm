using Enterprise.ALM.Application.DTOs.Auth;
using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Enterprise.ALM.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;

    public AuthService(IUserRepository userRepository, IConfiguration configuration)
    {
        _userRepository = userRepository;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginRequestDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["JwtSettings:SecretKey"]!);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role!.Name)
            }),
            Expires = DateTime.UtcNow.AddMinutes(
                double.Parse(_configuration["JwtSettings:ExpirationInMinutes"]!)),
            Issuer = _configuration["JwtSettings:Issuer"],
            Audience = _configuration["JwtSettings:Audience"],
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return new AuthResponseDto { Token = tokenHandler.WriteToken(token) };
    }

    public async Task<bool> RegisterAsync(RegisterRequestDto dto)
    {
        if (await _userRepository.EmailExistsAsync(dto.Email))
            return false;
        var newUser = new User
        {
            Email = dto.Email,
            Username = dto.Email.Split('@')[0],
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId = 3,
            IsActive = true
        };
        await _userRepository.AddAsync(newUser);
        await _userRepository.SaveChangesAsync();
        return true;
    }
}