#!/bin/bash
set -e
ROOT="/Users/staff/.openclaw-autoclaw/workspace/projects/praktis-video"
REC="$ROOT/recordings"
VO="$ROOT/assets/vo"
SLIDES="$ROOT/assets"
BUILD="$ROOT/build"
mkdir -p "$BUILD"
WEBM=$(ls "$REC"/*.webm | head -1)

echo "=== 1. music (ambient pad, procedural/royalty-free) ==="
ffmpeg -y -v error \
  -f lavfi -i "sine=frequency=110:duration=85" \
  -f lavfi -i "sine=frequency=164.81:duration=85" \
  -f lavfi -i "sine=frequency=220:duration=85" \
  -f lavfi -i "sine=frequency=261.63:duration=85" \
  -filter_complex "[0:a]volume=0.14[a0];[1:a]volume=0.11[a1];[2:a]volume=0.09[a2];[3:a]volume=0.07[a3];[a0][a1][a2][a3]amix=inputs=4:normalize=0,tremolo=f=0.12:d=0.5,lowpass=f=1400,afade=t=in:st=0:d=4,afade=t=out:st=76:d=9" \
  -ar 44100 -ac 1 "$BUILD/music.wav"
echo "music: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$BUILD/music.wav")s"

echo "=== 2. VO aiff -> wav 44.1k mono ==="
for i in 1 2 3 4 5 6; do
  ffmpeg -y -v error -i "$VO/seg$i.aiff" -ar 44100 -ac 1 "$BUILD/seg$i.wav"
done

echo "=== 3. demo webm -> mp4 1920x1080 ==="
ffmpeg -y -v error -i "$WEBM" -vf "scale=1920:1080:flags=lanczos,format=yuv420p,fps=30" \
  -c:v libx264 -preset medium -crf 20 -an -movflags +faststart "$BUILD/demo.mp4"
echo "demo: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$BUILD/demo.mp4")s"

echo "=== 4. slides -> video ==="
ffmpeg -y -v error -loop 1 -i "$SLIDES/intro.png" -t 11 -vf "scale=1920:1080,format=yuv420p" -r 30 -c:v libx264 -preset medium -crf 20 "$BUILD/intro.mp4"
ffmpeg -y -v error -loop 1 -i "$SLIDES/outro.png" -t 15 -vf "scale=1920:1080,format=yuv420p" -r 30 -c:v libx264 -preset medium -crf 20 "$BUILD/outro.mp4"

echo "=== 5. concat intro+demo+outro ==="
cat > "$BUILD/list.txt" <<EOF
file '$BUILD/intro.mp4'
file '$BUILD/demo.mp4'
file '$BUILD/outro.mp4'
EOF
ffmpeg -y -v error -f concat -safe 0 -i "$BUILD/list.txt" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an "$BUILD/full-video.mp4"
echo "full-video: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$BUILD/full-video.mp4")s"

echo "=== 6. narration (adelay per segmen) ==="
ffmpeg -y -v error \
  -i "$BUILD/seg1.wav" -i "$BUILD/seg2.wav" -i "$BUILD/seg3.wav" \
  -i "$BUILD/seg4.wav" -i "$BUILD/seg5.wav" -i "$BUILD/seg6.wav" \
  -filter_complex "[0:a]adelay=500[n1];[1:a]adelay=12000[n2];[2:a]adelay=27000[n3];[3:a]adelay=43000[n4];[4:a]adelay=55000[n5];[5:a]adelay=66000[n6];[n1][n2][n3][n4][n5][n6]amix=inputs=6:normalize=0" \
  -ar 44100 "$BUILD/narration.wav"
echo "narration: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$BUILD/narration.wav")s"

echo "=== 7. mix narration + music ==="
ffmpeg -y -v error -i "$BUILD/narration.wav" -i "$BUILD/music.wav" \
  -filter_complex "[0:a]volume=1.0[n];[1:a]volume=0.16[m];[n][m]amix=inputs=2:normalize=0,alimiter=limit=0.95" \
  -ar 44100 "$BUILD/audio-mix.wav"
echo "audio-mix: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$BUILD/audio-mix.wav")s"

echo "=== 8. mux final ==="
ffmpeg -y -v error -i "$BUILD/full-video.mp4" -i "$BUILD/audio-mix.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "$ROOT/video-praktis-v1.mp4"

echo "=== DONE ==="
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 "$ROOT/video-praktis-v1.mp4"
