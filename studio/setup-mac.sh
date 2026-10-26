#!/usr/bin/env bash
# One-time setup on macOS:  cd Hong-Quan/studio && ./setup-mac.sh
set -euo pipefail
cd "$(dirname "$0")"
command -v brew >/dev/null || { echo "Cài Homebrew trước: https://brew.sh"; exit 1; }
for p in node python ffmpeg git; do command -v "$p" >/dev/null || brew install "$p"; done
command -v python3 >/dev/null || brew install python
python3 -c "import numpy" 2>/dev/null || python3 -m pip install --user numpy
npm install --silent
npx --yes playwright install chromium
chmod +x build.sh engine/record-sim.sh

echo
[ -n "${ELEVENLABS_API_KEY:-}" ] && echo "✅ ELEVENLABS_API_KEY đã có" || echo "⚠️  Thêm key: echo 'export ELEVENLABS_API_KEY=sk_...' >> ~/.zshrc && source ~/.zshrc"
[ -d "/Applications/Google Chrome.app" ] && echo "✅ Google Chrome" || echo "⚠️  Nên cài Google Chrome (đăng nhập Google/OpenAI ổn định hơn)"
command -v xcrun >/dev/null && xcrun simctl help >/dev/null 2>&1 && echo "✅ iOS Simulator (Xcode)" || echo "ℹ️  Muốn quay app iPhone: cài Xcode từ App Store"
command -v adb >/dev/null && echo "✅ adb (Android)" || echo "ℹ️  Muốn quay app Android: cài Android Studio (có adb + emulator)"
cat <<'MSG'

Bước tiếp:
 1. System Settings → Privacy & Security → Screen Recording: bật cho Terminal/VS Code
 2. Đăng nhập tài khoản dùng để quay (profile Chrome riêng, không đụng Chrome chính):
      node engine/record.js --login
 3. Thử dựng tập mẫu:
      ./build.sh episodes/2026-10-26-3-repo-ai-agent
 4. Mở Claude Code tại thư mục Hong-Quan (terminal: claude, hoặc VS Code extension) và nói: "làm video hôm nay"
MSG
