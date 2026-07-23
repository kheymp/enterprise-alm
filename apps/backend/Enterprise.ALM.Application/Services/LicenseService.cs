using Enterprise.ALM.Application.DTOs.License;
using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Services;

public class LicenseService : ILicenseService
{
    private readonly ILicenseRepository _licenseRepository;

    public LicenseService(ILicenseRepository licenseRepository)
    {
        _licenseRepository = licenseRepository;
    }

    public async Task<List<LicenseResponseDto>> GetAllLicensesAsync(bool showInactive)
    {
        var licenses = await _licenseRepository.GetAllWithAllocationsAsync(showInactive);
        return licenses.Select(sl => new LicenseResponseDto
        {
            Id = sl.Id,
            Name = sl.Name,
            Publisher = sl.Publisher,
            TotalSeats = sl.TotalSeats,
            CostPerSeat = sl.CostPerSeat,
            RenewalDate = sl.RenewalDate,
            IsActive = sl.IsActive,
            AllocatedSeats = sl.Allocations?.Count ?? 0,
            Allocations = sl.Allocations?.Select(a => new LicenseAllocationDto
            {
                Id = a.Id,
                UserId = a.UserId,
                AssignedDate = a.AssignedDate
            }).ToList() ?? new List<LicenseAllocationDto>()
        }).ToList();
    }

    public async Task<LicenseResponseDto> CreateLicenseAsync(CreateLicenseDto dto)
    {
        var license = new SoftwareLicense
        {
            Name = dto.Name,
            Publisher = dto.Publisher,
            TotalSeats = dto.TotalSeats,
            CostPerSeat = dto.CostPerSeat,
            RenewalDate = DateTime.SpecifyKind(dto.RenewalDate, DateTimeKind.Utc),
            IsActive = dto.IsActive
        };

        await _licenseRepository.AddAsync(license);
        await _licenseRepository.SaveChangesAsync();

        return new LicenseResponseDto
        {
            Id = license.Id,
            Name = license.Name,
            Publisher = license.Publisher,
            TotalSeats = license.TotalSeats,
            CostPerSeat = license.CostPerSeat,
            RenewalDate = license.RenewalDate,
            IsActive = license.IsActive,
            AllocatedSeats = 0,
            Allocations = new List<LicenseAllocationDto>()
        };
    }

    public async Task<LicenseResponseDto?> UpdateLicenseAsync(int id, UpdateLicenseDto dto)
    {
        var license = await _licenseRepository.GetByIdAsync(id);
        if (license == null) return null;
        license.Name = dto.Name;
        license.Publisher = dto.Publisher;
        license.TotalSeats = dto.TotalSeats;
        license.CostPerSeat = dto.CostPerSeat;
        license.RenewalDate = DateTime.SpecifyKind(dto.RenewalDate, DateTimeKind.Utc);
        license.IsActive = dto.IsActive;
        await _licenseRepository.SaveChangesAsync();
        var allocatedSeats = await _licenseRepository.GetAllocationCountAsync(id);
        return new LicenseResponseDto
        {
            Id = license.Id,
            Name = license.Name,
            Publisher = license.Publisher,
            TotalSeats = license.TotalSeats,
            CostPerSeat = license.CostPerSeat,
            RenewalDate = license.RenewalDate,
            IsActive = license.IsActive,
            AllocatedSeats = allocatedSeats,
            Allocations = new List<LicenseAllocationDto>()
        };
    }

    public async Task<bool> DeleteLicenseAsync(int id)
    {
        var license = await _licenseRepository.GetByIdAsync(id);
        if (license == null) return false;
        license.IsActive = false;
        await _licenseRepository.SaveChangesAsync();
        return true;
    }

    public async Task<(bool Success, string? Error)> AllocateLicenseAsync(int licenseId, AllocateLicenseDto dto)
    {
        var license = await _licenseRepository.GetByIdAsync(licenseId);
        if (license == null) return (false, "License not found.");
        // BUSINESS RULE: Prevent allocation if license is inactive or expired
        if (!license.IsActive)
            return (false, "Cannot allocate seats on an inactive license.");
        if (license.RenewalDate < DateTime.UtcNow)
        {
            // Auto-deactivate the expired license as a defensive measure
            license.IsActive = false;
            await _licenseRepository.SaveChangesAsync();
            return (false, "Cannot allocate seats. This license has expired and has been deactivated.");
        }
        // BUSINESS RULE: Check seat availability
        var currentUsedSeats = await _licenseRepository.GetAllocationCountAsync(licenseId);
        if (currentUsedSeats >= license.TotalSeats)
            return (false, "No available seats left.");
        // BUSINESS RULE: Prevent duplicate allocations
        var alreadyAllocated = await _licenseRepository.IsAlreadyAllocatedAsync(licenseId, dto.UserId);
        if (alreadyAllocated)
            return (false, "This user already has a seat assigned for this software license.");
        var allocation = new LicenseAllocation
        {
            SoftwareLicenseId = licenseId,
            UserId = dto.UserId,
            AssignedDate = DateTime.UtcNow
        };
        await _licenseRepository.AddAllocationAsync(allocation);
        await _licenseRepository.SaveChangesAsync();
        return (true, null);
    }

    public async Task<bool> RemoveAllocationAsync(int licenseId, int userId)
    {
        var allocation = await _licenseRepository.GetAllocationAsync(licenseId, userId);
        if (allocation == null) return false;
        _licenseRepository.RemoveAllocation(allocation);
        await _licenseRepository.SaveChangesAsync();
        return true;
    }
}