# Quectel RGMII Toolkit — RM520N-GLAA fork

[![Branch SDXLEMUR](https://img.shields.io/badge/branch-SDXLEMUR-blue)](https://github.com/tuanlongsav/quectel-rgmii-toolkit/tree/SDXLEMUR)
[![Hardware RM520N-GLAA](https://img.shields.io/badge/hardware-RM520N--GLAA-success)](https://www.quectel.com/product/5g-rm520n-series)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey)](LICENSE)

Toolkit cài Simple Admin web UI + utilities cho modem **Quectel RM520N-GLAA**
(Qualcomm SDX62, armv7 32-bit, QTI Linux), tinh chỉnh cho hạ tầng mạng di động
Việt Nam và phần cứng cụ thể đang dùng làm gateway 5G RGMII.

> **Fork notice.** Đây là fork cá nhân của
> [iamromulan/quectel-rgmii-toolkit](https://github.com/iamromulan/quectel-rgmii-toolkit)
> nhánh `SDXLEMUR`, với rebrand URL về fork này, bug fixes, RM520N-GLAA
> compatibility, SMS Vietnam compatibility, cell auto-lock LTE/NSA/SA và
> visual/feature inspiration từ
> [dr-dolomite/QManager-RM520N](https://github.com/dr-dolomite/QManager-RM520N).
> Mọi credit kiến trúc gốc thuộc về [iamromulan](https://github.com/iamromulan).

## Cài đặt

Trên modem (qua `adb shell` hoặc SSH vào AP processor):

```sh
cd /tmp && wget -O RMxxx_rgmii_toolkit.sh \
  https://raw.githubusercontent.com/tuanlongsav/quectel-rgmii-toolkit/SDXLEMUR/RMxxx_rgmii_toolkit.sh \
  && chmod +x RMxxx_rgmii_toolkit.sh && ./RMxxx_rgmii_toolkit.sh
```

Chọn `2) Install Simple Admin`. Toolkit sẽ tự:
- Cài Entware/opkg (`/opt`) nếu chưa có
- Cài lighttpd + module (auth, cgi, openssl, proxy) với retry 3 lần
- Cài socat-at-bridge và **tự phát hiện `/dev/smd7` vs `/dev/smd11`** (RM520N-GLAA
  stock firmware có `/dev/smd7` chết — toolkit auto-rewire qua `/dev/smd11`)
- Cài Simple Admin UI vào `/usrdata/simpleadmin/www`
- Khởi động latency daemon (opt-out qua `systemctl disable simpleadmin_latency`)
- Đăng ký watchdog daemon (opt-in qua web UI)

Sau khi cài, mở `https://192.168.225.1/` từ trình duyệt cùng LAN. Credentials
mặc định `admin` / `simpleadmin` — đổi qua menu toolkit option 3.

## Yêu cầu phần cứng

- Quectel **RM520N-GLAA** (testbed chính) hoặc RM5xx series compatible
  (RM500Q-GL, RM502Q-AE, RM520N-GL, RM521F-GL — chưa kiểm chứng)
- Truy cập ADB hoặc SSH vào AP processor của modem (rootfs read-only,
  `/usrdata` writable)
- Modem có cellular internet (kiểm tra `AT+QMAPWAC=1` — modem cần auto-connect
  để pull dependencies từ Entware)
- ~50 MB trống trên `/usrdata`

## Tính năng

### Dashboard (`/`)
- **4 metric widgets**: Temperature (5-sensor fallback chain), SMS Received
  (count + click để vào SMS tab), Signal Information (% + RAT + bands +
  bandwidth), Internet Connection (status + provider + uptime + traffic stats)
- **Network Information** card + **Serving Cell** card side-by-side
- **Network Latency** sparkline 30 phút (vanilla SVG, ping daemon nhẹ —
  disable được qua systemctl)
- **6 progress bars** RSRQ/RSRP/SINR × 4G/5G, 2 cột × 3 hàng với color tier
  (green/yellow/red) và phần trăm normalize
- **Network Events** timeline — log band change, cell handoff, RAT change,
  CA change với 50 sự kiện gần nhất (detect client-side, không tốn AT command)
- Auto-refresh tunable 3–60s, dark/light theme với `prefers-color-scheme`
  default

### Network control (`/network.html`)
- **Band locking** cho LTE / NR5G-NSA / NR5G-SA với band whitelist
  RM520N-GLAA (warn khi chọn band ngoài datasheet)
- **Cell lock** manual: nhập tay EARFCN + PCI (LTE đa cell, NR-SA cell đơn
  với SCS + band)
- Quick-action buttons: Select all supported, RM520N preset, Reset
- APN + SIM slot management

### Serving Cell card có
- **Lock Current Cell** button hỗ trợ LTE, NR5G-NSA (dùng LTE anchor),
  NR5G-SA (dùng EARFCN+PCI+SCS+band)
- **Auto-lock toggle** với state machine: stable signal (RSRP > -85 dBm,
  SINR > 5 dB) trong 3 sample → auto lock; signal lost (RSRP < -110 dBm)
  trong 3 sample → auto unlock
- Status badge: idle / watching / locked / signal-lost

### SMS (`/sms.html`) — tối ưu mạng Việt Nam
- **Thread view** + flat list view, search filter realtime
- **Compose** với live char counter + UCS-2/GSM-7 detect + segment count
  (đúng spec 67 char/segment cho UCS-2 multipart, không cụt 3 ký tự cuối)
- **Brand sender decode** (VINAPHONE / VIETTEL / MOBIFONE) đúng UCS-2
- **Phone normalize** `+84` / `84` / `0XXX` / short code

### Settings (`/settings.html`)
- AT REPL (cả `get_atcommand` và `user_atcommand` paths)
- IPPT toggle, DNS proxy toggle, USB mode switcher
- TTL/HL modifier
- **Software Update**: check + apply OTA từ GitHub với snapshot/rollback
- **Auto-recovery Watchdog**: 4-tier escalation `AT+COPS=0` →
  `AT+CFUN=0;CFUN=1` → SIM swap → reboot. Disable per-tier qua env

### Reliability
- **OTA self-update**: snapshot `/usrdata/simpleadmin`, apply update, probe
  `https://127.0.0.1`, rollback nếu probe fail. Cron prune snapshots > 7 ngày
- **HTTPS** với cert tự ký + lighttpd Basic Auth
- **Resource budget**: latency daemon + watchdog (opt-in) tổng < 1% CPU,
  < 2 MB RAM, < 50 KB rolling logs. Mọi daemon đều có off-switch để ưu tiên
  tài nguyên modem cho kết nối mạng

### Security (vs upstream)
- Loại bỏ `eval $key=$value` injection vector trong toàn bộ CGI
- Parser query string whitelist + `printf -v` thay vì `eval`
- Validate input trước khi dispatch (regex hex cho SMS, integer range cho TTL)
- Quote-correct AT command building (fix `'AT+QNWLOCK="common/5g,0"'` typo)
- XSS cleanup trong scanner tables (scanner tab đã được gỡ vì `AT+QSCAN=3,1`
  ngắt cellular link 60-120s)

## Architecture

```
Browser (LAN)
   │  HTTPS :443  (Basic Auth /opt/etc/.htpasswd)
   ▼
lighttpd ──► cgi-bin/* shell scripts ──► socat-at-bridge
                                          ttyOUT  ──► /dev/smd11 (atcmd)
                                          ttyOUT2 ──► /dev/smd11 (auto-rewired
                                                      khi smd7 chết — RM520N
                                                      stock firmware)

Static frontend: vanilla HTML + Alpine.js + Bootstrap 5.3 + FontAwesome
                 (~150 KB total JS, no build step, no Node runtime on modem)

Daemons (opt-in/opt-out):
- simpleadmin_latency  — ping 1.1.1.1 mỗi 10s, log rolling 30 phút
- simpleadmin_watchdog — 4-tier auto-recovery (off by default)
- simplefirewall/ttl   — TTL mangle iptables rules
```

## Stack

- **Modem AP** (server): lighttpd, shell CGI (bash via `_lib.sh` shared lib),
  busybox + Entware utilities
- **Frontend** (browser): Bootstrap 5.3.3, Alpine.js 3.x, FontAwesome 6,
  Poppins font subset — tất cả vendor local (không CDN, không Node, không
  build step trên modem)
- **AT bridge**: socat-at-bridge với binary `atcmd` (smd11) + `atcmd11`
  (fallback)

## Acknowledgments

Fork này đứng trên nền của:

- **[iamromulan/quectel-rgmii-toolkit](https://github.com/iamromulan/quectel-rgmii-toolkit)**
  — codebase gốc, kiến trúc lighttpd + CGI + Alpine, install pipeline,
  socat-at-bridge, watchcat, Simple Admin UI v1
- **[dr-dolomite/QManager-RM520N](https://github.com/dr-dolomite/QManager-RM520N)**
  — visual design language (OKLCH + shadcn-style cards), feature ideas:
  latency history, 4-tier watchdog, network event log, OTA self-update
- **[Quectel](https://www.quectel.com/)** — AT Commands Manual RM520N-GL Series
- **[Bootstrap](https://getbootstrap.com/)** v5.3.3,
  **[Alpine.js](https://alpinejs.dev/)** 3.x,
  **[FontAwesome](https://fontawesome.com/)** 6

## License

Theo upstream — see [LICENSE](LICENSE). Modifications under the same terms.
