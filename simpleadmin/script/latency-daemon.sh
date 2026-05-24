#!/bin/sh
# Periodically ping a target and persist RTT samples to /tmp/latency.log
# in a tight rotating window. Designed to stay under 0.1% CPU on the
# RM520N-GLAA AP — one ping every PING_INTERVAL seconds, no curl/jq.
#
# Each log line: <unix_timestamp> <rtt_ms_or_empty>
# The reader (cgi-bin/get_latency) converts the file to JSON on demand.

TARGET="${1:-1.1.1.1}"
LOG=/tmp/latency.log
TMP=/tmp/latency.log.tmp
MAX_LINES="${MAX_LINES:-180}"   # 180 * 10s = 30 minutes
PING_INTERVAL="${PING_INTERVAL:-10}"
PING_TIMEOUT="${PING_TIMEOUT:-2}"

# Make sure the log file exists so the reader does not 404 on first open.
: > "$LOG" 2>/dev/null || true

while true; do
    ts=$(date +%s)
    # Linux ping prints "time=12.345 ms" — grab the number, blank on failure.
    rtt=$(ping -c1 -W "$PING_TIMEOUT" "$TARGET" 2>/dev/null \
        | sed -n 's/.*time=\([0-9.]*\).*/\1/p' \
        | head -1)
    printf '%s %s\n' "$ts" "$rtt" >> "$LOG"

    # Rotate to the last MAX_LINES so the file stays bounded.
    tail -n "$MAX_LINES" "$LOG" > "$TMP" && mv "$TMP" "$LOG"

    sleep "$PING_INTERVAL"
done
