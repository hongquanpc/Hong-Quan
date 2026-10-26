#!/usr/bin/env bash
# Full pipeline for one episode: voice -> data -> music -> frames -> mix -> QA gate.
#   ./build.sh episodes/<id>            real voice (needs ELEVENLABS_API_KEY)
#   FAKE=1 ./build.sh episodes/<id>     silent placeholder voice, for layout work
set -euo pipefail
cd "$(dirname "$0")"
EP="${1:?usage: ./build.sh episodes/<id>}"
ID="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['id'])" "$EP/episode.json")"
[ -d node_modules/simple-icons ] || npm install --silent

python3 engine/tts.py "$EP" ${FAKE:+--fake}
node engine/prepare.js "$EP"
python3 engine/music.py "$EP"
node engine/render.js "$EP"
node engine/render.js "$EP" --thumb
node engine/render.js "$EP" --qa

mkdir -p "$EP/out"
ffmpeg -v error -y -i "$EP/build/video.mp4" -i "$EP/build/music.wav" -i "$EP/build/voice.wav" -filter_complex \
  "[2:a]aformat=channel_layouts=stereo,volume=1.6,asplit=2[v][sc];[1:a]volume=0.7[m];[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];[md][v]amix=inputs=2:duration=first:normalize=0,volume=0.8,alimiter=limit=0.8:level=false[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$EP/out/$ID.mp4"
cp "$EP/build/thumbnail.png" "$EP/out/thumbnail.png"

python3 engine/qa.py "$EP" ${FAKE:+--skip-stt}
