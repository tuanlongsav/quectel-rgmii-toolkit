#!/bin/sh
# Remove /usrdata/simpleadmin.snap.* snapshots older than 7 days. Intended
# to be run by a periodic systemd timer (or cron). Conservative: keeps
# anything younger so a botched OTA can still roll back manually.
KEEP_DAYS="${KEEP_DAYS:-7}"
find /usrdata -maxdepth 1 -name 'simpleadmin.snap.*' -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} \; 2>/dev/null
