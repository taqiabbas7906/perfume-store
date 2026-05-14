# MongoDB Backup & Restore Runbook

## Atlas configuration (one-time)

In MongoDB Atlas → cluster → **Backup**:

1. **Enable Continuous Cloud Backup** (PITR).
2. **Snapshot schedule**:
   - Hourly snapshots, retention **48 h**
   - Daily snapshots, retention **30 d**
   - Weekly snapshots, retention **12 weeks**
   - Monthly snapshots, retention **12 months**
3. **PITR window**: **72 hours** (allows restore to any second within the past 3 days)
4. **Backup region**: same primary region; enable cross-region copy if compliance demands geo-redundancy.

## Restore drill — run every quarter

Goal: prove you can restore. An untested backup is not a backup.

1. In Atlas → **Backup → Restore**, pick a snapshot from 24 h ago.
2. Restore to a **new cluster** named `perfume-store-restore-test`.
3. Connect with `mongosh "$RESTORE_URI"` and verify document counts match prod within tolerance:
   ```js
   db.orders.countDocuments({})
   db.products.countDocuments({ active: true })
   db.users.countDocuments({})
   ```
4. Spot-check one recent order: `db.orders.findOne({}, {}, { sort: { createdAt: -1 } })`.
5. Tear down the test cluster.
6. Record the restore time in `docs/RUNBOOK_LOG.md` — target **< 30 min** for a 10 GB dataset.

## Emergency restore — production data loss

1. **STOP all writes**: scale app to 0 replicas or put it in maintenance mode.
2. Identify the last-known-good timestamp from the audit logs (`/api/admin/inventory` activity, `InventoryLog`, `WebhookEvent.receivedAt`).
3. Atlas → Backup → **Restore to point-in-time** → pick timestamp.
4. Restore to a **new cluster** (never overwrite prod in place).
5. Validate the restored cluster matches the expected state (counts + spot-checks).
6. Update `MONGODB_URI` env var on the app to point to the new cluster.
7. Roll the app forward.
8. Decommission the old cluster after 7 days.

## What's NOT backed up by Atlas

- **Algolia search index** — rebuildable from Mongo via `POST /api/admin/algolia/sync`.
- **Cloudinary images** — Cloudinary has its own backup. Verify retention in their console.
- **`.env` secrets** — store separately in your secret manager (1Password, Vault, AWS Secrets Manager).
- **Firebase users** — exportable via `firebase auth:export users.json` (script monthly).
