#!/bin/bash
set -e

echo "Waiting postgres start..."
until pg_isready -U postgres; do
  sleep 2
done

echo "Config pg_hba.conf to use md5..."
echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
echo "Reload Postgres SQL..."
pg_ctl reload -D /var/lib/postgresql/data

echo "Backup data from backup.dump..."
pg_restore -U postgres -d flogin /backup.dump

echo "Complete!"
