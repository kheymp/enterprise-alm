-- Local development only. Never run this against Neon.
-- Generates realistic data volume so performance work is measurable.

BEGIN;

-- 500 users. Department 'PerfTest' tags them so we can delete them later.
-- The password hash is a structurally-valid BCrypt string that matches no
-- password, so none of these accounts can be logged into.
INSERT INTO "Users"
    ("Username", "Email", "PasswordHash", "Department", "IsActive", "MustChangePassword", "RoleId")
SELECT
    'perfuser' || i,
    'perfuser' || i || '@perftest.local',
    '$2a$11$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQ',
    'PerfTest',
    true,
    false,
    3
FROM generate_series(1, 500) AS g(i);

-- A numbered list of the users we just made, so later inserts can pick one
-- by number instead of running a random lookup per row.
CREATE TEMP TABLE perf_users AS
SELECT "Id", row_number() OVER (ORDER BY "Id") AS rn
FROM "Users"
WHERE "Department" = 'PerfTest';

-- 10,000 assets. About 60% get assigned to a user.
INSERT INTO "Assets"
    ("Name", "SerialNumber", "PurchaseDate", "IsActive",
     "AssignedUserId", "PurchasePrice", "ExpectedLifespanMonths", "SalvageValue")
SELECT
    (ARRAY['ThinkPad X1','MacBook Pro 14','Dell Latitude 5540',
           'HP EliteBook 840','Surface Laptop 6'])[1 + (g.i % 5)],
    'PERF-SN-' || LPAD(g.i::text, 6, '0'),
    NOW() - ((random() * 1200)::int || ' days')::interval,
    true,
    CASE WHEN g.i % 10 < 6 THEN u."Id" ELSE NULL END,
    round((300 + random() * 2700)::numeric, 2),
    36,
    round((50 + random() * 250)::numeric, 2)
FROM generate_series(1, 10000) AS g(i)
LEFT JOIN perf_users u ON u.rn = 1 + (g.i % 500);

-- 200 licenses
INSERT INTO "SoftwareLicenses"
    ("Name", "Publisher", "TotalSeats", "CostPerSeat", "RenewalDate", "IsActive")
SELECT
    (ARRAY['Office 365','Slack','Figma','Jira','Zoom','Adobe CC',
           'GitHub','Notion','Datadog','Salesforce'])[1 + (g.i % 10)] || ' Team ' || g.i,
    (ARRAY['Microsoft','Salesforce','Figma Inc','Atlassian','Zoom',
           'Adobe','GitHub','Notion Labs','Datadog','Salesforce'])[1 + (g.i % 10)],
    60,
    round((5 + random() * 95)::numeric, 2),
    NOW() + ((random() * 700 - 60)::int || ' days')::interval,
    true
FROM generate_series(1, 200) AS g(i);

CREATE TEMP TABLE perf_licenses AS
SELECT "Id", row_number() OVER (ORDER BY "Id") AS rn
FROM "SoftwareLicenses"
WHERE "Name" LIKE '% Team %';

-- ~7,000 seat allocations. Each license gets between 10 and 59 users.
-- Joining two distinct sets guarantees every (license, user) pair is unique.
INSERT INTO "LicenseAllocations" ("SoftwareLicenseId", "UserId", "AssignedDate")
SELECT
    l."Id",
    u."Id",
    NOW() - ((random() * 365)::int || ' days')::interval
FROM perf_licenses l
JOIN perf_users u ON u.rn <= 10 + (l.rn % 50);

-- 100,000 audit log rows.
INSERT INTO "AuditLogs"
    ("EntityName", "EntityId", "Action", "OldValues", "NewValues",
     "ChangedColumns", "PerformedBy", "Timestamp")
SELECT
    (ARRAY['Asset','SoftwareLicense','User','LicenseAllocation'])[1 + (g.i % 4)],
    (1 + (g.i % 5000))::text,
    (ARRAY['Created','Updated','Deleted'])[1 + (g.i % 3)],
    '{"Name":"previous value"}',
    '{"Name":"updated value"}',
    '["Name"]',
    'perfuser' || (1 + (g.i % 500)) || '@perftest.local',
    NOW() - ((random() * 525600)::int || ' minutes')::interval
FROM generate_series(1, 100000) AS g(i);

COMMIT;

ANALYZE;