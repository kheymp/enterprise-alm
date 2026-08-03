-- Removes everything seed-perf-data.sql created.
BEGIN;

DELETE FROM "AuditLogs"
WHERE "PerformedBy" LIKE 'perfuser%@perftest.local';

DELETE FROM "LicenseAllocations"
WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Department" = 'PerfTest');

DELETE FROM "SoftwareLicenses" WHERE "Name" LIKE '% Team %';

DELETE FROM "Assets" WHERE "SerialNumber" LIKE 'PERF-SN-%';

DELETE FROM "Users" WHERE "Department" = 'PerfTest';

COMMIT;

ANALYZE;