# Database Backup & Recovery Guide

## Overview

This document describes the backup strategy for Modelisys PostgreSQL databases.

## Backup Strategy

### Automated Backups

#### Daily Backups
```bash
# Run daily at 2:00 AM UTC
0 2 * * * /opt/modelisys/scripts/backup.sh daily
```

#### Weekly Backups (Full)
```bash
# Run weekly on Sunday at 3:00 AM UTC
0 3 * * 0 /opt/modelisys/scripts/backup.sh weekly
```

### Retention Policy

| Type | Retention |
|------|-----------|
| Daily | 7 days |
| Weekly | 4 weeks |
| Monthly | 12 months |

## Backup Script

Create `/opt/modelisys/scripts/backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/modelisys"
DB_NAME="${POSTGRES_DB:-modelisys}"
DB_USER="${POSTGRES_USER:-modelisys}"
DB_HOST="${DB_HOST:-db}"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_TYPE"

# Perform backup
BACKUP_FILE="$BACKUP_DIR/$BACKUP_TYPE/modelisys_${TIMESTAMP}.sql.gz"

pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"

# Cleanup old backups
case "$BACKUP_TYPE" in
    daily)
        find "$BACKUP_DIR/daily" -type f -mtime +7 -delete
        ;;
    weekly)
        find "$BACKUP_DIR/weekly" -type f -mtime +28 -delete
        ;;
    monthly)
        find "$BACKUP_DIR/monthly" -type f -mtime +365 -delete
        ;;
esac

# Optional: Upload to S3
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/backups/$BACKUP_TYPE/"
fi

echo "Backup complete"
```

## Recovery Procedures

### Full Database Restore

```bash
# Stop the application
docker compose stop backend

# Restore from backup
pg_restore -h db -U modelisys -d modelisys \
    --clean --if-exists \
    /var/backups/modelisys/daily/modelisys_YYYYMMDD_HHMMSS.sql.gz

# Run any pending migrations
cd backend && alembic upgrade head

# Restart application
docker compose start backend
```

### Point-in-Time Recovery (PITR)

For production environments with continuous archiving:

1. Configure WAL archiving in `postgresql.conf`:
```
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
```

2. Recover to specific time:
```bash
pg_restore --target-time="2026-02-15 14:30:00" ...
```

### Single Table Restore

```bash
# Extract single table from backup
pg_restore -h db -U modelisys -d modelisys \
    --table=trial_balance_entries \
    /var/backups/modelisys/daily/modelisys_YYYYMMDD.sql.gz
```

## Migration Rollback

### View Migration History
```bash
cd backend
alembic history
```

### Rollback Last Migration
```bash
alembic downgrade -1
```

### Rollback to Specific Version
```bash
alembic downgrade <revision_id>
```

### Emergency Rollback Script

```bash
#!/bin/bash
# rollback.sh - Emergency migration rollback

set -euo pipefail

REVISION="${1:-}"
if [ -z "$REVISION" ]; then
    echo "Usage: ./rollback.sh <revision_id>"
    echo "Current revisions:"
    alembic history
    exit 1
fi

echo "Rolling back to revision: $REVISION"
alembic downgrade "$REVISION"
echo "Rollback complete"
```

## Monitoring

### Backup Health Checks

Add to monitoring system:

```bash
# Check backup exists and is recent (within 25 hours)
find /var/backups/modelisys/daily -type f -mmin -1500 | grep -q . \
    || echo "ALERT: No recent backup found"
```

### Backup Size Monitoring

Track backup sizes to detect anomalies:

```bash
du -sh /var/backups/modelisys/daily/*.sql.gz | tail -5
```

## Disaster Recovery

### RTO/RPO Targets

| Metric | Target |
|--------|--------|
| Recovery Point Objective (RPO) | 24 hours |
| Recovery Time Objective (RTO) | 4 hours |

### DR Procedure

1. **Identify failure** - Determine scope of data loss
2. **Select backup** - Choose most recent valid backup
3. **Provision infrastructure** - Spin up new database server if needed
4. **Restore data** - Execute restore procedure
5. **Verify integrity** - Run data validation queries
6. **Update DNS/config** - Point application to restored database
7. **Resume service** - Restart application and verify functionality

## Testing

### Monthly Backup Test

1. Restore backup to test environment
2. Run application test suite against restored data
3. Verify data integrity with checksums
4. Document results

### Test Script

```bash
#!/bin/bash
# test_backup.sh - Monthly backup verification

TEST_DB="modelisys_backup_test"
LATEST_BACKUP=$(ls -t /var/backups/modelisys/daily/*.sql.gz | head -1)

# Create test database
createdb -h db -U modelisys "$TEST_DB"

# Restore
pg_restore -h db -U modelisys -d "$TEST_DB" "$LATEST_BACKUP"

# Run verification queries
psql -h db -U modelisys -d "$TEST_DB" -c "
    SELECT 'users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'companies', COUNT(*) FROM companies
    UNION ALL
    SELECT 'trial_balance_entries', COUNT(*) FROM trial_balance_entries;
"

# Cleanup
dropdb -h db -U modelisys "$TEST_DB"

echo "Backup test complete"
```
