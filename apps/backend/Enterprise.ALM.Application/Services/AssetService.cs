using System.Globalization;
using System.Text;
using Enterprise.ALM.Application.DTOs.Asset;
using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Services;

public class AssetService : IAssetService
{
    private readonly IAssetRepository _assetRepository;

    public AssetService(IAssetRepository assetRepository)
    {
        _assetRepository = assetRepository;
    }

    public async Task<List<AssetResponseDto>> GetAllAssetsAsync()
    {
        var assets = await _assetRepository.GetAllWithAssignedUserAsync();

        return assets.Select(a => new AssetResponseDto
        {
            Id = a.Id,
            Name = a.Name,
            SerialNumber = a.SerialNumber,
            PurchaseDate = a.PurchaseDate,
            IsActive = a.IsActive,
            PurchasePrice = a.PurchasePrice,
            ExpectedLifespanMonths = a.ExpectedLifespanMonths,
            SalvageValue = a.SalvageValue,
            AssignedUserId = a.AssignedUserId,
            AssignedUserName = a.AssignedUser?.Username
        }).ToList();
    }

    public async Task<byte[]> ExportAssetsToCsvAsync()
    {
        // Reuse the list projection so the export can never drift out of sync
        // with what GET /api/assets returns — one source of truth for columns.
        var assets = await GetAllAssetsAsync();

        var sb = new StringBuilder();

        // UTF-8 BOM, so Excel reads the file as UTF-8 instead of guessing the
        // local ANSI codepage. Encoding.UTF8.GetBytes does NOT emit a preamble
        // on its own, so the BOM has to be a real character in the string.
        sb.Append((char)0xFEFF);

        CsvWriter.AppendRow(sb,
            "Id", "Name", "Serial Number", "Purchase Date", "Purchase Price",
            "Salvage Value", "Expected Lifespan (Months)", "Status", "Assigned To");

        // Every conversion is InvariantCulture: the host locale on Render is not
        // ours to control, and a culture using ',' as the decimal separator would
        // split a price across two columns and corrupt every field after it.
        foreach (var a in assets)
        {
            CsvWriter.AppendRow(sb,
                a.Id.ToString(CultureInfo.InvariantCulture),
                a.Name,
                a.SerialNumber,
                a.PurchaseDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                a.PurchasePrice.ToString("0.00", CultureInfo.InvariantCulture),
                a.SalvageValue.ToString("0.00", CultureInfo.InvariantCulture),
                a.ExpectedLifespanMonths.ToString(CultureInfo.InvariantCulture),
                a.IsActive ? "Active" : "Inactive",
                a.AssignedUserName);
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<AssetDetailResponseDto?> GetAssetDetailsAsync(int id)
    {
        var asset = await _assetRepository.GetByIdWithDetailsAsync(id);
        if (asset == null) return null;
        // Depreciation calculation — this is BUSINESS LOGIC, belongs here in Application
        var monthsOwned = ((DateTime.Now.Year - asset.PurchaseDate.Year) * 12)
                          + DateTime.Now.Month - asset.PurchaseDate.Month;
        var monthsPassed = Math.Min(monthsOwned, asset.ExpectedLifespanMonths);
        decimal monthlyDepreciation = (asset.PurchasePrice - asset.SalvageValue)
                                      / Math.Max(1, asset.ExpectedLifespanMonths);
        decimal currentValue = asset.PurchasePrice - (monthlyDepreciation * monthsPassed);
        return new AssetDetailResponseDto
        {
            Asset = new AssetResponseDto
            {
                Id = asset.Id,
                Name = asset.Name,
                SerialNumber = asset.SerialNumber,
                PurchaseDate = asset.PurchaseDate,
                IsActive = asset.IsActive,
                PurchasePrice = asset.PurchasePrice,
                ExpectedLifespanMonths = asset.ExpectedLifespanMonths,
                SalvageValue = asset.SalvageValue,
                AssignedUserId = asset.AssignedUserId,
                AssignedUserName = asset.AssignedUser?.Username
            },
            CalculatedCurrentValue = currentValue,
            MaintenanceRecords = asset.MaintenanceRecords.Select(m => new MaintenanceRecordDto
            {
                Id = m.Id,
                DatePerformed = m.DatePerformed,
                Description = m.Description,
                Cost = m.Cost
            }).ToList()
        };
    }

    public async Task<AssetResponseDto> CreateAssetAsync(CreateAssetDto dto)
    {
        var asset = new Asset
        {
            Name = dto.Name,
            SerialNumber = dto.SerialNumber,
            PurchaseDate = DateTime.SpecifyKind(dto.PurchaseDate, DateTimeKind.Utc),
            IsActive = dto.IsActive,
            PurchasePrice = dto.PurchasePrice,
            ExpectedLifespanMonths = dto.ExpectedLifespanMonths,
            SalvageValue = dto.SalvageValue,
            AssignedUserId = dto.AssignedUserId
        };
        await _assetRepository.AddAsync(asset);
        await _assetRepository.SaveChangesAsync();
        return new AssetResponseDto
        {
            Id = asset.Id,
            Name = asset.Name,
            SerialNumber = asset.SerialNumber,
            PurchaseDate = asset.PurchaseDate,
            IsActive = asset.IsActive,
            PurchasePrice = asset.PurchasePrice,
            ExpectedLifespanMonths = asset.ExpectedLifespanMonths,
            SalvageValue = asset.SalvageValue,
            AssignedUserId = asset.AssignedUserId
        };
    }

    public async Task<AssetResponseDto?> UpdateAssetAsync(int id, UpdateAssetDto dto)
    {
        var asset = await _assetRepository.GetByIdAsync(id);
        if (asset == null) return null;
        asset.Name = dto.Name;
        asset.SerialNumber = dto.SerialNumber;
        asset.PurchaseDate = DateTime.SpecifyKind(dto.PurchaseDate, DateTimeKind.Utc);
        asset.IsActive = dto.IsActive;
        asset.PurchasePrice = dto.PurchasePrice;
        asset.ExpectedLifespanMonths = dto.ExpectedLifespanMonths;
        asset.SalvageValue = dto.SalvageValue;
        asset.AssignedUserId = dto.AssignedUserId;
        await _assetRepository.SaveChangesAsync();
        return new AssetResponseDto
        {
            Id = asset.Id,
            Name = asset.Name,
            SerialNumber = asset.SerialNumber,
            PurchaseDate = asset.PurchaseDate,
            IsActive = asset.IsActive,
            PurchasePrice = asset.PurchasePrice,
            ExpectedLifespanMonths = asset.ExpectedLifespanMonths,
            SalvageValue = asset.SalvageValue,
            AssignedUserId = asset.AssignedUserId
        };
    }

    public async Task<bool> DeleteAssetAsync(int id)
    {
        var asset = await _assetRepository.GetByIdAsync(id);

        if (asset == null) return false;

        _assetRepository.Remove(asset);
        await _assetRepository.SaveChangesAsync();
        
        return true;
    }

    public async Task<MaintenanceRecordDto?> AddMaintenanceRecordAsync(int assetId, CreateMaintenanceRecordDto dto)
    {
        var asset = await _assetRepository.GetByIdAsync(assetId);
        if (asset == null) return null;
        var record = new MaintenanceRecord
        {
            AssetId = assetId,
            DatePerformed = DateTime.SpecifyKind(dto.DatePerformed, DateTimeKind.Utc),
            Description = dto.Description,
            Cost = dto.Cost
        };
        await _assetRepository.AddMaintenanceRecordAsync(record);
        await _assetRepository.SaveChangesAsync();
        return new MaintenanceRecordDto
        {
            Id = record.Id,
            DatePerformed = record.DatePerformed,
            Description = record.Description,
            Cost = record.Cost
        };
    }
}
