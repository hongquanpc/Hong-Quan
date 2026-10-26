#!/usr/bin/env bash
# Build the final video. With voice.wav present (from tts.py), music is ducked under the voice.
set -euo pipefail
cd "$(dirname "$0")"
OUT=aitoday_ai-agent-tat-giam-sat.mp4
python3 music.py music.wav
node render.js video_noaudio.mp4
node render.js --thumb
if [ -f voice.wav ]; then
  ffmpeg -v error -y -i video_noaudio.mp4 -i music.wav -i voice.wav -filter_complex \
    "[2:a]aformat=channel_layouts=stereo,volume=1.6,asplit=2[v][sc];[1:a]volume=0.7[m];[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];[md][v]amix=inputs=2:duration=first:normalize=0,volume=0.85,alimiter=limit=0.84[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$OUT"
else
  ffmpeg -v error -y -i video_noaudio.mp4 -i music.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
fi
rm -f video_noaudio.mp4 music.wav
echo "built $OUT + thumbnail.png"
