using Enterprise.ALM.Application.DTOs.Asset;

namespace Enterprise.ALM.Application.Interfaces;

public interface IAssetService
{
    Task<List<AssetResponseDto>> GetAllAssetsAsync();
    Task<AssetDetailResponseDto?> GetAssetDetailsAsync(int id);
    Task<AssetResponseDto> CreateAssetAsync(CreateAssetDto dto);
    Task<AssetResponseDto?> UpdateAssetAsync(int id, UpdateAssetDto dto);
    Task<bool> DeleteAssetAsync(int id);
    Task<MaintenanceRecordDto?> AddMaintenanceRecordAsync(int assetId, CreateMaintenanceRecordDto dto);
}