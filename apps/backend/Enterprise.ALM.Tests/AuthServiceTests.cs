using Enterprise.ALM.Application.DTOs.Auth;
using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Application.Services;
using Enterprise.ALM.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;

namespace Enterprise.ALM.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IConfiguration> _config = new();

    [Fact]
    public async Task LoginAsync_WrongPassword_ReturnsNull()
    {
        // Arrange
        var user = new User
        {
            Email = "user@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct-password")
        };
        _userRepo.Setup(r => r.GetByEmailAsync("user@test.com"))
                .ReturnsAsync(user);

        var service = new AuthService(_userRepo.Object, _config.Object);
        var dto = new LoginRequestDto { Email = "user@test.com", Password = "WRONG" };

        // Act
        var result = await service.LoginAsync(dto);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ReturnsNull()
    {
        // Arrange
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
                .ReturnsAsync((User?)null);

        var service = new AuthService(_userRepo.Object, _config.Object);
        var dto = new LoginRequestDto { Email = "ghost@test.com", Password = "anything" };

        // Act
        var result = await service.LoginAsync(dto);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokenWithRoleClaim()
    {
        // Arange
        var user = new User
        {
            Id = 1,
            Email = "admin@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("good-password"),
            Role = new Role { Name = "Admin" }
        };

        _userRepo.Setup(r => r.GetByEmailAsync("admin@test.com"))
            .ReturnsAsync(user);
        
        _config.Setup(c => c["JwtSettings:SecretKey"])
           .Returns("ThisIsASecretKeyForTestingPurposesOnly123!");
        _config.Setup(c => c["JwtSettings:ExpirationInMinutes"]).Returns("60");
        _config.Setup(c => c["JwtSettings:Issuer"]).Returns("test-issuer");
        _config.Setup(c => c["JwtSettings:Audience"]).Returns("test-audience");
        
        var service = new AuthService(_userRepo.Object, _config.Object);
        var dto = new LoginRequestDto { Email = "admin@test.com", Password = "good-password" };

        // Act
        var result = await service.LoginAsync(dto);

        // Assert
        Assert.NotNull(result);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result!.Token);
        var roleClaim = jwt.Claims.First(c => c.Type == "role");
        Assert.Equal("Admin", roleClaim.Value);

    }
}

