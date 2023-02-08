#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │             Determine video orientation and rotate to landscape              │
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

OUTPUT_FILENAME="output_landscape.mp4"
ROTATE=2
LOGLEVEL="error" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -o <OUTPUT_FILE> [-r ROTATION] [-l loglevel]\n\n" >&2 

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -r | --rotation <ROTATION>\n"
        printf "\t0 = 90CounterCLockwise and Vertical Flip\n"
        printf "\t1 = 90Clockwise\n"
        printf "\t2 = 90CounterClockwise (default)\n"
        printf "\t3 = 90Clockwise and Vertical Flip\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n"

        exit 1
    fi
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
            INPUT_FILENAME="$2"
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -r|--rotate)
            ROTATE="$2"
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

    printf "This will convert a portrait video to landscape.\n"

    if [[ -z "${INPUT_FILENAME}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit 1
    fi

    # ╭──────────────────────────────────────────────────────────╮
    # │           Step 1. Detect orientation of video.           │
    # ╰──────────────────────────────────────────────────────────╯
    WIDTH=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=width -of csv=p=0 ${INPUT_FILENAME})
    HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${INPUT_FILENAME})

    # If width is greater than height, it's already landscape.
    if [ "$WIDTH" -gt "$HEIGHT" ];then
        printf "❌ Already landscape (%sx%s)\n" "$WIDTH" "$HEIGHT"
    else

        # ╭──────────────────────────────────────────────────────────╮
        # │    Step 2. rotate video 90 degrees counter clockwise.    │
        # ╰──────────────────────────────────────────────────────────╯
        printf "🏞️  Landscape video detected (%sx%s). 👤 Converting to (%sx%s) portrait.\n" "$WIDTH" "$HEIGHT" "$HEIGHT" "$WIDTH"

        ffmpeg -v ${LOGLEVEL} -i $INPUT_FILENAME -vf "transpose=${ROTATE}" $OUTPUT_FILENAME

        printf "✅ Portrait video (%sx%s) created: %s\n" "$HEIGHT" "$WIDTH" "$OUTPUT_FILENAME"
    fi

}

usage $@
arguments $@
main $@