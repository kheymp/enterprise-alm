using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Interfaces;

public interface IUserRepository
{
    Task<List<User>> GetAllWithRolesAsync();
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByEmailAsync(string email);
    Task<bool> EmailExistsAsync(string email);
    Task AddAsync(User user);
    Task SaveChangesAsync();
    void Remove(User user);
}
