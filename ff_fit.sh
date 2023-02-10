#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │             Make a group of videos fit to a specific time length             │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

set -o errexit                                              # If a command fails bash exits.
set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.
cd "$(dirname "$0")"                                        # Change to the script folder.

# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯

OUTPUT_FILENAME="output_fps.mp4"
SECONDS="60"
LOGLEVEL="error" 
TMP_FILE="/tmp/tmp_ffmpeg_length_list.txt"                  # define temporary file

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE>... [-s <SECONDS>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Trim multiple input videos to fit a specific length of time.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"


        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"


        printf " -s | --seconds <SECONDS>\n"
        printf "\tThe length of the output video. Default is 60 seconds. (60) \n"
        printf "\tIf all the input videos are less that the target, the video length will be the sum of all the input videos.\n"
        printf "\tThe input videos will have an equal amount trimmed from the front and back of each to fit the length.\n\n"


        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n"

        exit 1
    fi
}

function setup()
{
    # delete any existing temp file.
    rm -f ${TMP_FILE} 
}


# ╭──────────────────────────────────────────────────────────╮
# │     Write the absolute path into the temporary file      │
# ╰──────────────────────────────────────────────────────────╯
function write_to_temp()
{
    FILE=$1

    # get absolute path of file.
    REAL_PATH=$(realpath ${FILE})

    # print to screen
    printf "➡️  file: %s\n" "${REAL_PATH}"

    # print line into temp file.
    printf "%s\n" "${REAL_PATH}" >> ${TMP_FILE}
}


# ╭──────────────────────────────────────────────────────────╮
# │         Take the arguments from the command line         │
# ╰──────────────────────────────────────────────────────────╯
function arguments()
{
    POSITIONAL_ARGS=()

    while [[ $# -gt 0 ]]; do
    case $1 in


        -i|--input)
            write_to_temp $2
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -s|--seconds)
            SECONDS="$2"
            shift 
            shift
            ;;


        -l|--loglevel)
            LOGLEVEL="$2"
            shift 
            shift
            ;;


        -*|--*)
            echo "Unknown option $1"
            exit 1
            ;;


        *)
            POSITIONAL_ARGS+=("$1") # save positional arg back onto variable
            shift                   # remove argument and shift past it.
            ;;
    esac
    done

}


# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    printf "This will output a video of %s seconds.\n" "${SECONDS}"

    FILE_COUNT=$(wc -l < ${TMP_FILE})

    # Define the total accumulative time
    TOTAL_DURATION=0

    # Loop through each line in the temporary list of input files.
    while read FILE; do
        # echo ${FILE}
        FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${FILE})
        # convert float to int ${STR%.*} AND add to TOTAL time.
        TOTAL_DURATION="$(($TOTAL_DURATION + ${FILE_DURATION%.*}))" 
    done < ${TMP_FILE}

    # Get how much time to trim off videos.
    TOTAL_TRIM_TIME="$(($SECONDS - $TOTAL_DURATION))"

    printf "Number of files: %s\n" "${FILE_COUNT}"
    printf "Time to remove from videos: %s\n" "${TOTAL_TRIM_TIME}"

    printf "🏎️  Trimming all input videos to fit the specified time.\n"

    # ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf fps=${FPS} ${OUTPUT_FILENAME}

    printf "✅ New video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
setup
arguments $@
main $@