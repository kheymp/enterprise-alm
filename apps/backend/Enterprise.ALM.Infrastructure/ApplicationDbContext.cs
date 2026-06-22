using Enterprise.ALM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Enterprise.ALM.Infrastructure;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // These DbSets represent our physical database tables
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // This ensures EF Core hardcodes these foundational roles into the database
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin", Description = "Full system authorization & rule control." },
            new Role { Id = 2, Name = "Manager", Description = "Read/Write assets, licenses, and seats." },
            new Role { Id = 3, Name = "Viewer", Description = "Read-only access to monitoring dashboards." }
        );
    }
    
}