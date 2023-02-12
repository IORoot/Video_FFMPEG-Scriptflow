#!/bin/bash

# ┌─────────────────────────────────────────────────────────────────────────┐ 
# │                                                                         │░
# │                                                                         │░
# │                     Convert all files in CSV file.                      │░
# │                                                                         │░
# │                                                                         │░
# └─────────────────────────────────────────────────────────────────────────┘░
#  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

# SOURCE The config file.
. ./config.conf

# Read the file and loop over the lines.
while read -r line
do
  ./src/scripts/convert_with_ffmpeg.sh $line;
done < "$CSVFILE"