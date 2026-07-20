using Enterprise.ALM.Application.DTOs.User;
using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;
using System.Security.Cryptography;
using System.Text;

namespace Enterprise.ALM.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<List<UserResponseDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllWithRolesAsync();

        return users.Select(u => new UserResponseDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            Department = u.Department,
            IsActive = u.IsActive,
            RoleId = u.RoleId,
            RoleName = u.Role?.Name
        }).ToList();
    }

    public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto)
    {
        var tempPassword = GenerateTempPassword();

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            Department = dto.Department,
            IsActive = dto.IsActive,
            RoleId = dto.RoleId == 0 ? 3 : dto.RoleId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            MustChangePassword = true
        };
        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        return new UserResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Department = user.Department,
            IsActive = user.IsActive,
            RoleId = user.RoleId,
            TemporaryPassword = tempPassword   // returned ONCE so the admin can share it
        };
    }

    private static string GenerateTempPassword()
    {
        // Excludes lookalike chars (0/O, 1/l/I) so it's easy to read aloud/type.
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        var bytes = RandomNumberGenerator.GetBytes(14);
        var sb = new StringBuilder(14);
        foreach (var b in bytes) sb.Append(chars[b % chars.Length]);
        return sb.ToString();
    }

    public async Task<bool> UpdateUserAsync(int id, UpdateUserDto dto)
    {
        var existingUser = await _userRepository.GetByIdAsync(id);
        if (existingUser == null) return false;
        existingUser.Username = dto.Username;
        existingUser.Email = dto.Email;
        existingUser.Department = dto.Department;
        existingUser.IsActive = dto.IsActive;
        if (dto.RoleId != 0)
        {
            existingUser.RoleId = dto.RoleId;
        }
        await _userRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return false;
        _userRepository.Remove(user);
        await _userRepository.SaveChangesAsync();
        return true;
    }
}