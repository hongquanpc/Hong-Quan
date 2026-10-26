#!/usr/bin/env bash
# Record a phone simulator/emulator screen (macOS).
#   engine/record-sim.sh ios     episodes/<id>/media/<name>.mp4 [seconds]   # iOS Simulator (Xcode) — must be booted
#   engine/record-sim.sh android episodes/<id>/media/<name>.mp4 [seconds]   # Android emulator or USB phone (adb)
#   engine/record-sim.sh mac     episodes/<id>/media/<name>.mp4 [seconds]   # whole Mac screen (needs Screen Recording permission)
# Drive the app by hand (or let Claude drive it with computer use) while it records.
set -euo pipefail
KIND="${1:?ios|android|mac}"; OUT="${2:?output .mp4}"; SECS="${3:-30}"
mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp -d)"
case "$KIND" in
  ios)
    xcrun simctl io booted recordVideo --codec=h264 --force "$TMP/raw.mov" & PID=$!
    echo "Đang quay iOS Simulator ${SECS}s…"; sleep "$SECS"; kill -INT "$PID"; wait "$PID" || true ;;
  android)
    adb shell screenrecord --time-limit "$SECS" /sdcard/aitoday_rec.mp4
    adb pull /sdcard/aitoday_rec.mp4 "$TMP/raw.mov" >/dev/null && adb shell rm /sdcard/aitoday_rec.mp4 ;;
  mac)
    # "Capture screen 0" index: list devices with  ffmpeg -f avfoundation -list_devices true -i ""
    ffmpeg -v error -y -f avfoundation -framerate 30 -capture_cursor 1 -capture_mouse_clicks 1 -i "${SCREEN_INDEX:-1}:none" -t "$SECS" "$TMP/raw.mov" ;;
  *) echo "unknown kind $KIND"; exit 1 ;;
esac
ffmpeg -v error -y -i "$TMP/raw.mov" -c:v libx264 -pix_fmt yuv420p -crf 18 -r 30 -an "$OUT"
rm -rf "$TMP"
echo "recorded $OUT"
