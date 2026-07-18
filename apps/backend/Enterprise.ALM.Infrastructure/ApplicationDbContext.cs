using Enterprise.ALM.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace Enterprise.ALM.Infrastructure;

public class ApplicationDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    // These DbSets represent our physical database tables
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }
    public DbSet<SoftwareLicense> SoftwareLicenses { get; set; }
    public DbSet<LicenseAllocation> LicenseAllocations { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Asset>()
            .HasOne(a => a.AssignedUser)
            .WithMany()
            .HasForeignKey(a => a.AssignedUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // This ensures EF Core hardcodes these foundational roles into the database
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin", Description = "Full system authorization & rule control." },
            new Role { Id = 2, Name = "Manager", Description = "Read/Write assets, licenses, and seats." },
            new Role { Id = 3, Name = "Viewer", Description = "Read-only access to monitoring dashboards." }
        );

        // Index for querying audit logs by entity
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => new { a.EntityName, a.EntityId });

        // Index for querying audit logs by timestamp
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.Timestamp);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = OnBeforeSaveChanges();
        var result = await base.SaveChangesAsync(cancellationToken);
        await OnAfterSaveChanges(auditEntries, cancellationToken);
        return result;
    }

    private List<AuditEntry> OnBeforeSaveChanges()
    {
        ChangeTracker.DetectChanges();

        var auditEntries = new List<AuditEntry>();

        foreach (var entry in ChangeTracker.Entries())
        {
            // Skip audit log entities themselves to avoid infinite recursion
            if (entry.Entity is AuditLog)
                continue;

            // Only care about entities that were added, modified, or deleted
            if (entry.State == EntityState.Detached ||
                entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditEntry
            {
                EntityName = entry.Entity.GetType().Name,
                Action = entry.State switch
                {
                    EntityState.Added => "Created",
                    EntityState.Modified => "Updated",
                    EntityState.Deleted => "Deleted",
                    _ => "Unknown"
                },
                PerformedBy = GetCurrentUsername(),
                Timestamp = DateTime.UtcNow
            };

            foreach (var property in entry.Properties)
            {
                // Skip temporary values (like auto-generated IDs that EF hasn't assigned yet)
                if (property.IsTemporary)
                {
                    auditEntry.TemporaryProperties.Add(property);
                    continue;
                }

                string propertyName = property.Metadata.Name;

                // Capture the primary key
                if (property.Metadata.IsPrimaryKey())
                {
                    auditEntry.EntityId = property.CurrentValue?.ToString() ?? "";
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.NewValues[propertyName] = property.CurrentValue;
                        break;

                    case EntityState.Deleted:
                        auditEntry.OldValues[propertyName] = property.OriginalValue;
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.ChangedColumns.Add(propertyName);
                            auditEntry.OldValues[propertyName] = property.OriginalValue;
                            auditEntry.NewValues[propertyName] = property.CurrentValue;
                        }
                        break;
                }
            }

            auditEntries.Add(auditEntry);
        }

        // Save audit entries that have all their values resolved
        foreach (var auditEntry in auditEntries.Where(e => !e.HasTemporaryProperties))
        {
            AuditLogs.Add(auditEntry.ToAuditLog());
        }

        // Return entries with temporary properties — we'll handle them after SaveChanges
        return auditEntries.Where(e => e.HasTemporaryProperties).ToList();
    }

    private async Task OnAfterSaveChanges(List<AuditEntry> auditEntries, CancellationToken cancellationToken)
    {
        if (auditEntries.Count == 0) return;

        // Now the temporary values (like auto-generated IDs) have been assigned
        foreach (var auditEntry in auditEntries)
        {
            foreach (var prop in auditEntry.TemporaryProperties)
            {
                if (prop.Metadata.IsPrimaryKey())
                {
                    auditEntry.EntityId = prop.CurrentValue?.ToString() ?? "";
                }
                else
                {
                    auditEntry.NewValues[prop.Metadata.Name] = prop.CurrentValue;
                }
            }
            AuditLogs.Add(auditEntry.ToAuditLog());
        }

        await base.SaveChangesAsync(cancellationToken);
    }

    private string GetCurrentUsername()
    {
        var username = _httpContextAccessor?.HttpContext?.User?
            .FindFirstValue(ClaimTypes.Email);
        return username ?? "System";
    }
}

/// <summary>
/// Helper class that temporarily holds audit data while EF Core resolves temporary values
/// (like auto-generated primary keys for newly inserted entities).
/// </summary>
internal class AuditEntry
{
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? PerformedBy { get; set; }
    public DateTime Timestamp { get; set; }
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();
    public List<string> ChangedColumns { get; } = new();
    public List<Microsoft.EntityFrameworkCore.ChangeTracking.PropertyEntry> TemporaryProperties { get; } = new();
    public bool HasTemporaryProperties => TemporaryProperties.Count > 0;

    public AuditLog ToAuditLog() => new()
    {
        EntityName = EntityName,
        EntityId = EntityId,
        Action = Action,
        OldValues = OldValues.Count == 0 ? null : JsonSerializer.Serialize(OldValues),
        NewValues = NewValues.Count == 0 ? null : JsonSerializer.Serialize(NewValues),
        ChangedColumns = ChangedColumns.Count == 0 ? null : JsonSerializer.Serialize(ChangedColumns),
        PerformedBy = PerformedBy,
        Timestamp = Timestamp
    };
}
