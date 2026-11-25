#!/bin/bash
# encode.sh <frames_dir> <out.mp4>
ffmpeg -loglevel error -y -framerate 30 -i "$1/f%05d.jpg" -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "$2"
