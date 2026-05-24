#!/bin/sh
# 4-tier auto-recovery watchdog for RM520N-GLAA.
#
# Healthy path: ping TARGET every CHECK_INTERVAL seconds, do nothing.
# When ping fails, escalate one tier at a time, waiting RECOVERY_WAIT
# seconds between escalations so the modem actually has a chance to
# reconnect before the next, more disruptive action.
#
# Tier 0 : healthy
# Tier 1 : AT+COPS=0  (force re-registration to current PLMN)
# Tier 2 : AT+CFUN=0;CFUN=1  (radio off/on)
# Tier 3 : AT+QUIMSLOT=<the_other_slot>  (failover to other SIM)
# Tier 4 : /sbin/reboot

TARGET="${1:-1.1.1.1}"
STATE_FILE=/tmp/watchdog.state
LOG=/tmp/watchdog.log
TMP=/tmp/watchdog.log.tmp
MAX_LOG_LINES="${MAX_LOG_LINES:-100}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
RECOVERY_WAIT="${RECOVERY_WAIT:-60}"

# Allow individual tiers to be disabled via env (1 = on, 0 = off). Tier 0 is
# always implicit. Useful for users who never want the reboot tier.
TIER1_ENABLED="${TIER1_ENABLED:-1}"
TIER2_ENABLED="${TIER2_ENABLED:-1}"
TIER3_ENABLED="${TIER3_ENABLED:-1}"
TIER4_ENABLED="${TIER4_ENABLED:-1}"

at_cmd() {
    # Reuse the same atcmd binary the rest of the toolkit uses (socat-at-bridge).
    if command -v atcmd >/dev/null 2>&1; then
        atcmd "$1" 2>/dev/null
    elif [ -e /dev/ttyOUT2 ]; then
        printf '%s\r\n' "$1" | microcom -t 2000 /dev/ttyOUT2 2>/dev/null
    fi
}

get_state() { cat "$STATE_FILE" 2>/dev/null || echo 0; }
set_state() {
    echo "$1" > "$STATE_FILE"
    printf '%s tier=%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" >> "$LOG"
    tail -n "$MAX_LOG_LINES" "$LOG" > "$TMP" && mv "$TMP" "$LOG"
}

# Boot: clear previous state.
set_state 0 "watchdog started, target=$TARGET"

while true; do
    if ping -c1 -W3 "$TARGET" >/dev/null 2>&1; then
        if [ "$(get_state)" != "0" ]; then
            set_state 0 "recovery succeeded"
        fi
        sleep "$CHECK_INTERVAL"
        continue
    fi

    # Ping failed. Escalate based on current tier.
    case "$(get_state)" in
        0)
            if [ "$TIER1_ENABLED" = "1" ]; then
                set_state 1 "ping fail -> AT+COPS=0"
                at_cmd 'AT+COPS=0'
                sleep "$RECOVERY_WAIT"
            else
                # Tier 1 disabled, skip ahead.
                set_state 1 "ping fail -> tier1 disabled, skipping"
            fi
            ;;
        1)
            if [ "$TIER2_ENABLED" = "1" ]; then
                set_state 2 "still down -> AT+CFUN=0;CFUN=1"
                at_cmd 'AT+CFUN=0;+CFUN=1'
                sleep $((RECOVERY_WAIT + 30))
            else
                set_state 2 "still down -> tier2 disabled, skipping"
            fi
            ;;
        2)
            if [ "$TIER3_ENABLED" = "1" ]; then
                slot_line=$(at_cmd 'AT+QUIMSLOT?' | tr -d '\r')
                current=$(printf '%s' "$slot_line" | sed -n 's/.*QUIMSLOT: *\([12]\).*/\1/p')
                if [ "$current" = "1" ]; then
                    set_state 3 "still down -> switch SIM 1 -> 2"
                    at_cmd 'AT+QUIMSLOT=2'
                else
                    set_state 3 "still down -> switch SIM 2 -> 1"
                    at_cmd 'AT+QUIMSLOT=1'
                fi
                sleep $((RECOVERY_WAIT + 60))
            else
                set_state 3 "still down -> tier3 disabled, skipping"
            fi
            ;;
        3)
            if [ "$TIER4_ENABLED" = "1" ]; then
                set_state 4 "still down -> reboot"
                sleep 2
                /sbin/reboot
                # reboot returns immediately; the next loop iteration may run
                # briefly before the kernel takes us down.
                sleep 30
            else
                set_state 4 "still down -> tier4 disabled, stuck"
                # Stay here; user must intervene.
                sleep "$RECOVERY_WAIT"
            fi
            ;;
        *)
            # Unknown state (manual edit / corrupted file) — reset.
            set_state 0 "unknown state, resetting"
            ;;
    esac
done
