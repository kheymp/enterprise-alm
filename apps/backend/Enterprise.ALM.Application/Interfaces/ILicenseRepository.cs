using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Interfaces;

public interface ILicenseRepository
{
    Task<List<SoftwareLicense>> GetAllWithAllocationsAsync(bool showInactive);
    Task<SoftwareLicense?> GetByIdAsync(int id);
    Task AddAsync(SoftwareLicense license);
    Task SaveChangesAsync();
    Task<int> GetAllocationCountAsync(int licenseId);
    Task<bool> IsAlreadyAllocatedAsync(int licenseId, int userId);
    Task AddAllocationAsync(LicenseAllocation allocation);
    Task<LicenseAllocation?> GetAllocationAsync(int licenseId, int userId);
    void RemoveAllocation(LicenseAllocation allocation);
}
