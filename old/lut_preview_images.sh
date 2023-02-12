#!/bin/bash

# ┌─────────────────────────────────────────────────────────────────────────┐ 
# │                                                                         │░
# │                                                                         │░
# │      Create a sample image of every LUT file from the input video.      │░
# │                                                                         │░
# │                                                                         │░
# └─────────────────────────────────────────────────────────────────────────┘░
#  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

# Take Arguments.
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 FILE" >&2
  exit 1
fi

INPUTFILE=$1
OUTFOLDER="./2_output_instagram_videos/lut_thumbs"
LUTFOLDER="./src/luts"

mkdir $OUTFOLDER

for LUTFILE in "${LUTFOLDER}"/*
do
  if [[ -f $LUTFILE ]]; then

    LUTBASE=$( basename ${LUTFILE%.*})
    FILEBASE=$( basename ${INPUTFILE%.*})

    ffmpeg -hide_banner -nostats -loglevel panic \
      -i $INPUTFILE \
      -ss 00:00:01.000 \
      -vf lut3d=$LUTFILE \
      -vframes 1 \
      -nostdin \
      -shortest "${OUTFOLDER}/${FILEBASE}_${LUTBASE}.png"
  fi
done