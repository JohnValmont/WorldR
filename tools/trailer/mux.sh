#!/bin/bash
# mux.sh <cut> <outname>
cd "$(dirname "$0")"
ffmpeg -loglevel error -y -framerate 30 -i render/$1/f%05d.jpg -i audio/score-$1.wav \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -tune film -movflags +faststart \
  -c:a aac -b:a 256k -ar 48000 -shortest "out/$2"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "out/$2"
