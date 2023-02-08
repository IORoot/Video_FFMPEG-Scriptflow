#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                    ROTATE a video in 90 degree increments                    │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# Take Arguments.
if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
    echo "Usage: $0 FILE [ROTATION] [OUTPUT_FILE]" >&2

    printf "\n[rotation]\n"
    printf "0 = 180 Degrees
1 = 90 Degrees Clockwise
2 = 90 Degrees Counter Clockwise (default)\n"

    printf "\n[output file]\n"
    printf "output_rotate.mp4 (default)\n"

    exit 1
fi

function start()
{

    FILE=$1
    ROTATE=2
    OUTPUT="output_rotate.mp4"

    if [ ! -z "${2}" ]; then
        ROTATE=$2
    fi

    if [ ! -z "${3}" ]; then
        OUTPUT=$3
    fi

    printf "🔄 This will rotate video %s to file %s.\n" "$FILE" "$OUTPUT"

    if [[ "$ROTATE" -eq "0" ]];then
        # ╭──────────────────────────────────────────────────────────╮
        # │                    Rotate 180 degrees                    │
        # ╰──────────────────────────────────────────────────────────╯
        ffmpeg -v error -i $FILE -vf "transpose=2,transpose=2" $OUTPUT
    else
        # ╭──────────────────────────────────────────────────────────╮
        # │                 Rotate 90 or 270 degrees                 │
        # ╰──────────────────────────────────────────────────────────╯
        ffmpeg -v error -i $FILE -vf "transpose=${ROTATE}" $OUTPUT
    fi

}

start $@