/**
 * Response shapes for the ASP.NET backend, hand-mirrored from the DTOs in
 * apps/backend/Enterprise.ALM.Application/DTOs/.
 *
 * Conversions applied: PascalCase -> camelCase (ASP.NET's default JSON
 * policy), DateTime -> string (ISO 8601 as it arrives over the wire, not a
 * Date object), decimal/int/long -> number, C# nullables -> `| null`.
 *
 * These are hand-written on purpose: the API is finished and maintained by
 * one person, so a codegen toolchain would cost more than it saves.
 */

/* ── Users ── */
// UserResponseDto
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  department: string;
  isActive: boolean;
  roleId: number;
  roleName: string | null;
  temporaryPassword: string | null;
}

/* ── Assets ── */
// AssetResponseDto
export interface AssetResponse {
  id: number;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  isActive: boolean;
  purchasePrice: number;
  expectedLifespanMonths: number;
  salvageValue: number;
  assignedUserId: number | null;
  assignedUserName: string | null;
}

// MaintenanceRecordDto
export interface MaintenanceRecord {
  id: number;
  datePerformed: string;
  description: string;
  cost: number;
}

// AssetDetailResponseDto — GET /api/assets/:id. Note the nested `asset`.
export interface AssetDetailResponse {
  asset: AssetResponse;
  calculatedCurrentValue: number;
  maintenanceRecords: MaintenanceRecord[];
}

/* ── Licenses ── */
// LicenseAllocationDto
export interface LicenseAllocation {
  id: number;
  userId: number;
  assignedDate: string;
}

// LicenseResponseDto
export interface LicenseResponse {
  id: number;
  name: string;
  publisher: string;
  totalSeats: number;
  costPerSeat: number;
  renewalDate: string;
  isActive: boolean;
  allocatedSeats: number;
  allocations: LicenseAllocation[];
}

/* ── Dashboard ── */
// ExpiringLicenseDto
export interface ExpiringLicense {
  name: string;
  publisher: string;
  renewalDate: string;
  daysRemaining: number;
}

// DashboardSummaryDto — GET /api/dashboard/summary
export interface DashboardSummary {
  totalAssets: number;
  totalAssetValue: number | null;
  totalLicenses: number;
  totalLicenseCost: number | null;
  assignedAssets: number;
  unassignedAssets: number;
  totalSeatsOwned: number;
  totalSeatsUsed: number;
  expiringLicensesCount: number;
  expiringLicenses: ExpiringLicense[];
}

/* ── Audit ── */
/**
 * AuditLogResponseDto. `action` is a plain string on the DTO, but
 * ApplicationDbContext derives it from an exhaustive switch on EntityState,
 * so these four values are the complete set — including the "Unknown"
 * fallback arm, which the frontend previously omitted.
 */
export interface AuditLogResponse {
  id: number;
  entityName: string;
  entityId: string;
  action: 'Created' | 'Updated' | 'Deleted' | 'Unknown';
  oldValues: string | null;
  newValues: string | null;
  changedColumns: string | null;
  performedBy: string | null;
  timestamp: string;
}

/* ── Auth ── */
/**
 * Claims written by AuthService.GenerateJwtToken. Not a DTO — this is the
 * decoded token payload, so it mirrors the Claim list, not a C# class.
 * `mustChangePassword` is the string "true"/"false", not a boolean: the
 * backend stringifies it via .ToString().ToLower().
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  mustChangePassword: string;
}
