using Enterprise.ALM.Application.DTOs.License;
using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Application.Services;
using Enterprise.ALM.Domain.Entities;
using Moq;
using Xunit;

namespace Enterprise.ALM.Tests;

public class LicenseServiceTests
{
    private readonly Mock<ILicenseRepository> _licenseRepo = new();

    [Fact]
    public async Task AllocateLicenseAsync_NoSeatsLeft_ReturnsFailure()
    {
        // Arrange
        var license = new SoftwareLicense
        {
            Id = 1,
            TotalSeats = 5,
            IsActive = true,
            RenewalDate = DateTime.UtcNow.AddYears(1)
        };
        _licenseRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(license);
        _licenseRepo.Setup(r => r.GetAllocationCountAsync(1)).ReturnsAsync(5); // full

        var service = new LicenseService(_licenseRepo.Object);
        var dto = new AllocateLicenseDto { UserId = 42 };

        // Act
        var (success, error) = await service.AllocateLicenseAsync(1, dto);

        // Assert
        Assert.False(success);
        Assert.Equal("No available seats left.", error);
    }

    [Fact]
    public async Task AllocateLicenseAsync_SeatsAvailable_ReturnsSuccess()
    {
        // Arrange
        var license = new SoftwareLicense
        {
            Id = 1,
            TotalSeats = 5,
            IsActive = true,
            RenewalDate = DateTime.UtcNow.AddYears(1)
        };
        _licenseRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(license);
        _licenseRepo.Setup(r => r.GetAllocationCountAsync(1)).ReturnsAsync(2); // room left
        _licenseRepo.Setup(r => r.IsAlreadyAllocatedAsync(1, 42)).ReturnsAsync(false);

        var service = new LicenseService(_licenseRepo.Object);
        var dto = new AllocateLicenseDto { UserId = 42 };

        // Act
        var (success, error) = await service.AllocateLicenseAsync(1, dto);

        // Assert
        Assert.True(success);
        Assert.Null(error);
        _licenseRepo.Verify(r => r.AddAllocationAsync(It.IsAny<LicenseAllocation>()), Times.Once);
    }
}

