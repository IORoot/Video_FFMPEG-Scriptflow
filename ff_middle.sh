#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │         Trim a video to it's middle part. Remove start / end equally         │
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

OUTPUT_FILENAME="output_middle.mp4"
TRIM="1"
LOGLEVEL="error"                 # define temporary file

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-t <TRIM>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "For MACOS This requires coreutils run: brew install coreutils.\n\n"
        printf "Trim input video from start and end by a number of seconds.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"


        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"


        printf " -t | --trim <TRIM>\n"
        printf "\tNumber of seconds to remove from the start and end of video. Default is 1 second. (1) \n\n"


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


        -t|--trim)
            TRIM="$2"
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

    if [[ -z "${INPUT_FILENAME}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit 1
    fi

    printf "This will remove %s seconds from front and end of video.\n" "${TRIM}"

    FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${INPUT_FILENAME})
    printf "⏲️ Original File duration: %s\n" "${FILE_DURATION}"

    HALF_TRIM_FROM_START=$(echo "scale=4; ${TRIM} / 2" | bc | awk '{printf "%f", $0}')      # send to 'bc' command for floating numbers. Awk used to add leading '0' if less than 1.
    START=$(gdate -d@${HALF_TRIM_FROM_START} -u +%H:%M:%S.%N)                               # convert to timestamp

    HALF_TRIM_FROM_END=$(echo "scale=4; ${FILE_DURATION} - ${HALF_TRIM_FROM_START}" | bc | awk '{printf "%f", $0}')
    END=$(gdate -d@${HALF_TRIM_FROM_END} -u +%H:%M:%S.%N)

    printf "🏎️  Trimming input video to fit the specified time.\n"

    ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -ss ${START} -to ${END} ${OUTPUT_FILENAME}

    NEW_FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${OUTPUT_FILENAME})
    printf "✅ New video created: %s. ⏲️  new duration: %s\n" "$OUTPUT_FILENAME" "${NEW_FILE_DURATION}"

}

usage $@
arguments $@
main $@