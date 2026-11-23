# PACT — Database Production Safety, Migrations & Disaster Recovery

This document establishes operational procedures, safety invariants, and backup/recovery strategies for PACT's production PostgreSQL database on Render.

---

## 1. Zero-Discrepancy Data Invariants

PACT handles community grocery purchases and fair billing splits. The following financial and auditing invariants are strictly enforced at the database level:

1. **Integer Money Representation**:
   All monetary amounts (prices, discounts, delivery shares, rounding remainders, refunds) are stored as integer **paise** (`BIGINT` or `INTEGER`). Floating-point arithmetic is strictly prohibited.
2. **Immutable Financial Invoices**:
   Once a cycle is finalized and invoices are generated (`status = 'ISSUED' | 'PAID'`), invoice line items and header balances cannot be mutated. Adjustments must take the form of credit notes or separate refund records.
3. **Audited Stock Movements**:
   Inventory quantities in `inventory_levels` must have corresponding entries in `stock_movements` recording the reason (`INWARD`, `OUTWARD_PACKED`, `ADJUSTMENT`), source batch, actor, and before/after balances.
4. **Relational Constraints**:
   Foreign key relationships are enforced with explicit cascade and protect rules. Soft deletes or tombstone flags are used where audit history is required.

---

## 2. Migration Execution Standards

### Pre-Deployment Migration Rule
Migrations must execute **before** application traffic is routed to new code.

In Render, this is achieved via:
1. `render.yaml` startup script:
   ```bash
   alembic upgrade head
   ```
2. Migrations run within a single transaction per revision (`with context.begin_transaction():`).
3. Non-destructive migration rule:
   - **Never drop columns or tables in production automatically.**
   - Migrations requiring schema changes follow the **Expand / Contract pattern**:
     - *Phase 1 (Expand)*: Add new column (nullable or with default).
     - *Phase 2 (Dual Write)*: Application writes to both old and new columns.
     - *Phase 3 (Backfill)*: Migrate historical data.
     - *Phase 4 (Contract)*: Remove old column in a later release.

---

## 3. Automated Backups & Point-in-Time Recovery (PITR)

### Render Managed PostgreSQL Backups
1. **Daily Automated Snapshots**:
   Render creates automatic daily backups for paid PostgreSQL instances (`starter`, `standard`, `pro`) with 7 to 30 days retention.
2. **Point-In-Time Recovery (PITR)**:
   For databases on the standard plan or higher, Write-Ahead Logs (WAL) are streamed continuously, allowing recovery to any specific second in the past 7 days.

### Manual Backup Procedure (pg_dump)
Prior to running major schema migrations or monthly financial finalization:

```bash
# 1. Export database snapshot with compression
pg_dump "$DATABASE_URL" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file="pact_backup_$(date +%Y%m%d_%H%M%S).dump"

# 2. Verify archive integrity
pg_restore --list "pact_backup_$(date +%Y%m%d_%H%M%S).dump" > /dev/null
echo "Backup verified successfully."
```

### Offsite Backup Sync
For disaster resilience, an automated GitHub Actions or cron worker can upload encrypted daily dumps to AWS S3 / Cloudflare R2:

```bash
aws s3 cp pact_backup_*.dump s3://pact-database-backups/backups/ --sse AES256
```

---

## 4. Disaster Recovery & Rollback Runbook

### Scenario A: Migration Failure During Deployment
1. If `alembic upgrade head` encounters an error, the deployment aborts before the web service goes live.
2. The current running service continues serving requests on the existing schema.
3. Fix migration SQL locally, verify with `pytest`, and push the corrected revision.

### Scenario B: Database Restoration from Backup
1. Provision a standby PostgreSQL instance in the Render dashboard.
2. Restore the database:
   ```bash
   pg_restore --clean --if-exists --no-owner --dbname="$NEW_DATABASE_URL" pact_backup_latest.dump
   ```
3. Update the `DATABASE_URL` environment variable on `pact-api` and `pact-worker`.
4. Trigger redeploy. Verify `/ready` returns `HTTP 200 {"status": "ready", "database": "connected"}`.
