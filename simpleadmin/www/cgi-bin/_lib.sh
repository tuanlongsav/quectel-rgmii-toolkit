#!/bin/bash
# Shared helpers for Simple Admin CGI scripts.
# Source from a CGI with:   . "$(dirname "$0")/_lib.sh"

# URL-decode a single value. Reads from $1, writes to stdout.
urldecode() {
    local data="${1//+/ }"
    printf '%b' "${data//%/\\x}"
}

# Parse QUERY_STRING into named shell variables, ONLY for keys listed in $1.
# Pass a space-separated whitelist; any key outside the list is dropped silently.
# Each accepted value is urldecoded before assignment. No eval over user input.
#
# Example:
#   parse_query "atcmd number msg"
#   echo "$atcmd"
parse_query() {
    local allowed=" $1 "
    local kv k v
    # QUERY_STRING is provided by lighttpd; strip semicolons defensively.
    local qs="${QUERY_STRING//;/}"
    [ -z "$qs" ] && return 0
    local IFS='&'
    set -f
    for kv in $qs; do
        case "$kv" in
            *=*) ;;
            *) continue ;;
        esac
        k="${kv%%=*}"
        v="${kv#*=}"
        # Reject keys containing anything other than [A-Za-z0-9_]
        case "$k" in
            *[!A-Za-z0-9_]*|'') continue ;;
        esac
        # Whitelist gate.
        case "$allowed" in
            *" $k "*) ;;
            *) continue ;;
        esac
        v=$(urldecode "$v")
        # Assign WITHOUT eval. printf -v supports indirect assignment safely.
        printf -v "$k" '%s' "$v"
    done
    set +f
}
