#!/bin/sh
# The delivery file, from the rendered frames (render.mjs) and the mastered
# score (score.mjs):
#
#   sh encode.sh <frames dir> <score.wav> <out.mp4> [max rate, default 20M]
#
# Exactly 1080 by 1920, so every 6 px cell stays whole. BT.709, limited range,
# left sited chroma taken by point from inside each 2 by 2 block, which on a
# cell grid aligned to (0, 0) is exact. H.264 High at CRF 14 under a ceiling
# (Instagram takes up to 25 Mbps), two B frames, a closed GOP of two seconds,
# the grain tune's lighter deblocking and its care for dark flat areas.
# AAC at 256 kbps, 48 kHz.
#
# Meta asks for the moov atom first and no edit lists, so the B frames are
# carried by negative composition offsets, and the score's first 1024
# samples (21 ms, kept near silent in the score for this) give way to the
# AAC encoder's priming: the sound stays on its frames and the file stays
# 30.000 s.
set -e
frames=$1
score=$2
out=$3
max=${4:-20M}
buf=$(( ${max%M} * 2 ))M
ffmpeg -hide_banner -y \
  -framerate 30 -start_number 0 -i "$frames/%04d.png" \
  -i "$score" \
  -map 0:v -map 1:a \
  -vf "zscale=m=709:r=limited:chromal=left:filter=point,format=yuv420p" \
  -c:v libx264 -profile:v high -level:v 4.2 -preset slow -crf 14 -maxrate "$max" -bufsize "$buf" \
  -x264-params "deblock=-2,-2:aq-mode=3" -g 60 -bf 2 -flags +cgop \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -af "atrim=start_sample=1024,asetpts=N/SR/TB" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  -use_editlist 0 -movflags +faststart+negative_cts_offsets \
  "$out"
