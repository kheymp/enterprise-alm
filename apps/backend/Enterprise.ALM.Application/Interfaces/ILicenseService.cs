using Enterprise.ALM.Application.DTOs.License;

namespace Enterprise.ALM.Application.Interfaces;

public interface ILicenseService
{
    Task<List<LicenseResponseDto>> GetAllLicensesAsync(bool showInactive);
    Task<LicenseResponseDto> CreateLicenseAsync(CreateLicenseDto dto);
    Task<LicenseResponseDto?> UpdateLicenseAsync(int id, UpdateLicenseDto dto);
    Task<bool> DeleteLicenseAsync(int id);
    Task<(bool Success, string? Error)> AllocateLicenseAsync(int licenseId, AllocateLicenseDto dto);
    Task<bool> RemoveAllocationAsync(int licenseId, int userId);
}
