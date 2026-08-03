# Performance Work

Baseline measurements and the optimizations made against them. Numbers here are
reproducible: the seed script and the method are both in the repo.

## Method

Local Postgres 16 (Docker, `docker-compose.yml`), seeded via
`infra/perf/seed-perf-data.sql`:

| Table | Rows |
| --- | --- |
| Assets | 10,003 |
| Users | 503 |
| SoftwareLicenses | 200 |
| LicenseAllocations | 6,900 |
| AuditLogs | 100,000 |

- **Query counts** — EF Core command logging
  (`Microsoft.EntityFrameworkCore.Database.Command` at `Information`, Development only).
- **Latency** — 50 sequential requests after a 5-request warm-up, p95 reported.
  Measured against the API directly, not through the browser: React StrictMode
  double-invokes effects in development, which doubles the request count.
- **Timing client** — `HttpClient.GetByteArrayAsync`, which downloads bytes without
  parsing them. `Invoke-RestMethod` and `Invoke-WebRequest -UseBasicParsing` were
  both tried first and discarded: on a 448 KB response they spent 115–660ms in
  PowerShell's own JSON and HTML parsers, swamping the server time being measured.
- Query counts were captured with SQL logging enabled, latency with it disabled,
  since console-logging every statement is itself a measurable cost.
- `ANALYZE` run after seeding so the query planner has accurate table statistics.
- `DemoResetJob` disabled locally via `DemoMode:Enabled` — it wipes every table
  it touches on startup and hourly.

## Baseline — 2026-08-04, before any optimization

| Endpoint | SQL queries | Response | Avg | p95 |
| --- | --- | --- | --- | --- |
| `GET /api/dashboard/summary` | 8 | 1.1 KB | 16.2ms | 24.1ms |
| `GET /api/licenses` | 1 | 447.8 KB | 25.8ms | 34.1ms |
| `GET /api/auditlogs` | 1 | 12.9 KB | 3.1ms | 3.6ms |

Two distinct problems, neither of them the query planner.

### `GET /api/dashboard/summary` — too many round trips

Eight sequential queries, one per `await` in `DashboardService.GetSummaryAsync`:

| # | SQL | Method |
| --- | --- | --- |
| 1 | `count(*) FROM "Assets" WHERE "IsActive"` | `GetActiveAssetCountAsync` |
| 2 | `sum("PurchasePrice")` | `GetTotalAssetValueAsync` |
| 3 | `count(*) … "AssignedUserId" IS NOT NULL` | `GetAssignedAssetCountAsync` |
| 4 | `count(*) FROM "SoftwareLicenses"` | `GetActiveLicenseCountAsync` |
| 5 | `sum("CostPerSeat" * "TotalSeats")` | `GetTotalLicenseCostAsync` |
| 6 | `sum("TotalSeats")` | `GetTotalSeatsOwnedAsync` |
| 7 | `count(*) FROM "LicenseAllocations" INNER JOIN …` | `GetTotalSeatsUsedAsync` |
| 8 | `SELECT … WHERE "RenewalDate" <= @cutoff` | `GetExpiringLicensesAsync` |

The endpoint returns 1.1 KB, so serialization and transfer are negligible —
essentially all 16.2ms is eight round trips at roughly 2ms each.

That 2ms is a *localhost* round trip. Production runs the API on Render and
Postgres on Neon, on separate hosts, so each of the eight also pays real network
latency. This is the finding that degrades worst on deployment.

### `GET /api/licenses` — 448 KB to display seat counts

`LicenseRepository.GetAllWithAllocationsAsync` uses `.Include(sl => sl.Allocations)`,
which EF Core compiles to a `LEFT JOIN` returning one row per allocation — 200
licenses arrive as ~6,900 wide rows. EF rebuilds the object graph as tracked
entities, `LicenseService` maps it to ~7,100 DTOs, and the result serializes to
447.8 KB.

The list view's actual requirement is `AllocatedSeats`, a single integer per
license, which Postgres could compute with `COUNT`.

The query itself is 2ms. The other ~24ms is materialization, mapping, and
serialization — plus the client-side parsing cost noted in Method.

### `GET /api/auditlogs` — no action

3.1ms for a `LIMIT 50` over 100,000 rows, served by the existing `Timestamp`
index. Not a bottleneck; left unchanged.

Not yet measured: the filtered variant (`?entityName=&entityId=`), where the
`(EntityName, EntityId)` index serves the filter but not the `ORDER BY Timestamp`.
Worth an `EXPLAIN ANALYZE` before assuming an index is needed.

## Fix 1 — dashboard aggregate queries

`DashboardService.GetSummaryAsync` awaited eight repository calls in sequence, each
returning a single figure. Six of those eight read only two tables, so they were
collapsed into two aggregate queries using `GroupBy(x => 1)` — the LINQ idiom for
"aggregate the whole table", which EF Core compiles to one `SELECT` per table:

```sql
SELECT count(*)::int AS "TotalAssets",
       COALESCE(sum(t."PurchasePrice"), 0.0) AS "TotalAssetValue",
       count(*) FILTER (WHERE t."AssignedUserId" IS NOT NULL)::int AS "AssignedAssets"
FROM (SELECT a."AssignedUserId", a."PurchasePrice", 1 AS "Key"
      FROM "Assets" AS a WHERE a."IsActive") AS t
GROUP BY t."Key"
LIMIT 1
```

Seats-used reads a different table and expiring-licenses returns rows rather than
aggregates, so both remain separate queries. Four is the floor without contortions.
`AsNoTracking()` was added to the expiring-licenses read, which is read-only.

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| SQL queries | 8 | 4 | −50% |
| Database time | 18ms | 12ms | −33% |
| Avg latency | 16.2ms | 12.1ms | −25% |
| p95 latency | 24.1ms | 13.7ms | −43% |

Response payload unchanged at 1.1 KB — the API contract is identical, only the
number of round trips changed.

p95 improved considerably more than the average. Each round trip is an
opportunity to catch a slow one, so halving their number compresses the tail
faster than it moves the mean. Tail latency is what users perceive.

Not measured: production. The gain should be larger on Render + Neon, where the
API and database are on separate hosts and every round trip pays real network
latency rather than a ~2ms loopback — but that is an expectation, not a
measurement.

### Why not `Task.WhenAll` (fix 1)

Running the original eight queries concurrently would not work: `DbContext` is not
thread-safe, and concurrent operations on one instance throw. Doing it properly
would require `IDbContextFactory` and eight separate contexts, consuming eight
pooled connections per dashboard load on the endpoint every user hits first.
Issuing fewer queries is strictly better than making a bad pattern concurrent.

## Fix 2 — license list projection

`GetAllWithAllocationsAsync` used `.Include(sl => sl.Allocations)`, which EF Core
compiles to a `LEFT JOIN` returning one row per allocation. 200 licenses arrived as
~6,900 wide rows, were rebuilt into tracked entities, mapped to ~7,100 DTOs, and
serialized to 447.8 KB — so the list view could show a seat count per license.

The query now projects directly to a `LicenseListItemDto`, with the count computed
by Postgres:

```csharp
.Select(sl => new LicenseListItemDto
{
    // ...
    AllocatedSeats = sl.Allocations.Count
})
```

Inside a `.Select()`, EF does not load the allocations to count them — the count is
pushed into the query and the rows never leave the database.

The seat-management dialog does need the allocation rows, so it reads them from
`GET /api/licenses/{id}` instead. That endpoint was added separately and ahead of
this change, so this PR was a projection plus a frontend rewire rather than new
backend surface plus a frontend rewire.

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Response payload | 447.8 KB | 30.4 KB | −93% |
| Avg latency | 25.8ms | 5.8ms | −78% |
| p95 latency | 34.1ms | 6.8ms | −80% |
| SQL queries | 1 | 1 | unchanged |

The query count was never the problem here — the volume was. This is the opposite
shape of fix 1, which is why measuring first mattered: the endpoint with one query
was slower than the one with eight.

### Seat allocation changes

The dialog previously refreshed itself after every assign and remove by refetching
the entire list. It now refetches the single license:

| | Before | After |
| --- | --- | --- |
| Payload per seat change | 447.8 KB | 0.2 KB |

That path was paid on every allocation change, not just on page load.

### Client-side cost

`docs/performance.md` measures server time with a client that only downloads bytes.
The parsers that were rejected for measurement are a reasonable proxy for what a
real client pays to consume a response: PowerShell spent 115–660ms turning the
447.8 KB payload into objects. A browser is considerably faster, but the direction
holds — an oversized response costs the receiver too, and that cost does not appear
in server-side timings.

## Reproducing

`appsettings.Development.json` is gitignored (it holds the JWT secret and the
connection string), so these two settings have to be added by hand:

```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  },
  "DemoMode": {
    "Enabled": false
  }
}
```

`DemoMode:Enabled` defaults to `true` when the key is absent (see `Program.cs`),
so production is unaffected — only local runs opt out of the demo reset.

Set the EF logging level to `Information` when counting queries and `Warning`
when timing, for the reason given under Method.

```powershell
docker compose up -d
Get-Content infra/perf/seed-perf-data.sql | docker compose exec -T postgres psql -U postgres -d enterprise_alm
dotnet run --project apps/backend/Enterprise.ALM.Api --launch-profile http
```

Then, in a second terminal:

```powershell
Add-Type -AssemblyName System.Net.Http

$base = "http://localhost:5132"
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"demo@enterprise-alm.app","password":"Demo!2026"}'

$client = New-Object System.Net.Http.HttpClient
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $login.token)

function Measure-Endpoint($path) {
    $url = "$base$path"
    1..5 | ForEach-Object { $null = $client.GetByteArrayAsync($url).Result }
    $times = 1..50 | ForEach-Object {
        (Measure-Command { $null = $client.GetByteArrayAsync($url).Result }).TotalMilliseconds
    }
    $sorted = $times | Sort-Object
    $bytes = $client.GetByteArrayAsync($url).Result.Length
    [PSCustomObject]@{
        Endpoint = $path
        Avg = [math]::Round(($times | Measure-Object -Average).Average, 1)
        P95 = [math]::Round($sorted[47], 1)
        KB  = [math]::Round($bytes / 1KB, 1)
    }
}

Measure-Endpoint "/api/dashboard/summary"
Measure-Endpoint "/api/licenses"
Measure-Endpoint "/api/auditlogs"
```

`infra/perf/clean-perf-data.sql` removes everything the seed script created.
