#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │         Trim a video to it's middle part. Remove start / end equally         │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.mp4"
OUTPUT_FILENAME="ff_middle.mp4"
TRIM="1"
LOGLEVEL="error"                 # define temporary file
GREP=""

function stylesheet()
{
    TEXT_GREEN_400="\e[38;2;74;222;128m"
    TEXT_ORANGE_500="\e[38;2;249;115;22m"
    TEXT_RED_400="\e[38;2;248;113;113m"
    TEXT_BLUE_600="\e[38;2;37;99;235m"
    TEXT_YELLOW_500="\e[38;2;234;179;8m"
    TEXT_PURPLE_500="\e[38;2;168;85;247m"
    TEXT_RESET="\e[39m"
}
stylesheet

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

        printf " -g | --grep <STRING>\n"
        printf "\tSupply a grep string for filtering the inputs if a folder is specified.\n\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

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
            INPUT_FILENAME=$(realpath "$2")
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


        -g|--grep)
            GREP="$2"
            shift 
            shift
            ;;


        -C|--config)
            CONFIG_FILE="$2"
            shift 
            shift
            ;;


        -l|--loglevel)
            LOGLEVEL="$2"
            shift 
            shift
            ;;


        --description)              # IGNORED. used for descriptions in JSON 
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
# │        Read config-file if supplied. Requires JQ         │
# ╰──────────────────────────────────────────────────────────╯
function read_config()
{
    # Check if config has been set.
    if [ -z ${CONFIG_FILE+x} ]; then return 0; fi
    
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        printf "JQ is a dependency and could not be found. Please install JQ for JSON parsing. Exiting.\n"
        exit
    fi

    # Read file
    LIST_OF_INPUTS=$(cat ${CONFIG_FILE} | jq -r 'to_entries[] | ["--" + .key, .value] | @sh' | xargs) 


    # Sen to the arguments function again to override.
    arguments $LIST_OF_INPUTS
}


# ╭──────────────────────────────────────────────────────────╮
# │   Exit the app by just skipping the ffmpeg processing.   │
# │            Then copy the input to the output.            │
# ╰──────────────────────────────────────────────────────────╯
function exit_gracefully()
{
    cp -f ${INPUT_FILENAME} ${OUTPUT_FILENAME}
    exit 0
}



# ╭──────────────────────────────────────────────────────────╮
# │     Run these checks before you run the main script      │
# ╰──────────────────────────────────────────────────────────╯
function pre_flight_checks()
{
    INPUT_FILE=$1

    # Check input filename has been set.
    if [[ -z "${INPUT_FILE+x}" ]]; then 
        printf "\t❌ No input file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check input file exists.
    if [ ! -f "$INPUT_FILE" ]; then
        printf "\t❌ Input file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check input filename is a movie file.
    if ffprobe "${INPUT_FILE}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILE}"
        ffprobe "${INPUT_FILE}"
        exit_gracefully
    fi
}


function print_flags()
{
    printf "🔪 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Trim" "$TRIM"
}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    print_flags

    # If this is a file
    if [ -f "$INPUT_FILENAME" ]; then
        pre_flight_checks $INPUT_FILENAME
            FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${INPUT_FILENAME})
            HALF_TRIM_FROM_START=$(echo "scale=4; ${TRIM} / 2" | bc | awk '{printf "%f", $0}')      # send to 'bc' command for floating numbers. Awk used to add leading '0' if less than 1.
            START=$(gdate -d@${HALF_TRIM_FROM_START} -u +%H:%M:%S.%N)                               # convert to timestamp
            HALF_TRIM_FROM_END=$(echo "scale=4; ${FILE_DURATION} - ${HALF_TRIM_FROM_START}" | bc | awk '{printf "%f", $0}')
            END=$(gdate -d@${HALF_TRIM_FROM_END} -u +%H:%M:%S.%N)
            ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -ss ${START} -to ${END} ${OUTPUT_FILENAME}
            NEW_FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${OUTPUT_FILENAME})
        printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"
    fi

    # If this is a drectory
    if [ -d "$INPUT_FILENAME" ]; then
        LOOP=0
        LIST_OF_FILES=$(find $INPUT_FILENAME -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | grep "$GREP")
        for INPUT_FILENAME in $LIST_OF_FILES
        do
            pre_flight_checks $INPUT_FILENAME
                FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${INPUT_FILENAME})
                HALF_TRIM_FROM_START=$(echo "scale=4; ${TRIM} / 2" | bc | awk '{printf "%f", $0}')      # send to 'bc' command for floating numbers. Awk used to add leading '0' if less than 1.
                START=$(gdate -d@${HALF_TRIM_FROM_START} -u +%H:%M:%S.%N)                               # convert to timestamp
                HALF_TRIM_FROM_END=$(echo "scale=4; ${FILE_DURATION} - ${HALF_TRIM_FROM_START}" | bc | awk '{printf "%f", $0}')
                END=$(gdate -d@${HALF_TRIM_FROM_END} -u +%H:%M:%S.%N)
                ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -ss ${START} -to ${END} ${LOOP}_${OUTPUT_FILENAME}
                NEW_FILE_DURATION=$(ffprobe -v ${LOGLEVEL} -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${LOOP}_${OUTPUT_FILENAME})
            printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "${LOOP}_${OUTPUT_FILENAME}"
            LOOP=$(expr $LOOP + 1)
        done
    fi

    printf "✅ %-10s ( ⏲️  new duration: %s)\n" "$OUTPUT_FILENAME" "${NEW_FILE_DURATION}"

}

usage $@
arguments $@
read_config "$@"
main $@