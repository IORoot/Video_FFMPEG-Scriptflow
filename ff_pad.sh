#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │             Add padding around the video with a specific colour               │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

set -o errexit                                              # If a command fails bash exits.
set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.mp4"
OUTPUT_FILENAME="ff_pad.mp4"
LOGLEVEL="error" 
WIDTH="iw"
HEIGHT="ih*2"
XPIXELS="(ow-iw)/2"
YPIXELS="(oh-ih)/2"
COLOUR="#fb923c"
DAR="16/9"
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
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Create padding around the edges of the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -w | --width <WIDTH>\n"
        printf "\tWidth of the output video. Default: Same as input video.\n"
        printf "\t0 : use the input value.\n\n"

        printf " -h | --height <HEIGHT>\n"
        printf "\tHeight of the output video. Default: double input video height.\n"
        printf "\t0 : use the input value.\n\n"

        printf " -x | --xpixels <PIXELS>\n"
        printf "\tWhere to position the video in the frame on X-Axis from left.\n\n"

        printf " -y | --ypixels <PIXELS>\n"
        printf "\tWhere to position the video in the frame on Y-Axis from top.\n\n"
        printf "\tThe width, height, x and y parameters also have access to the following variables:\n"
        printf "\t- iw : The input video's width.\n"
        printf "\t- ih : The input video's height.\n"
        printf "\t- ow : The output video's width.\n"
        printf "\t- oh : The output video's height.\n"
        printf "\tThese can be used to calculate areas of the screen. For example:\n"
        printf "\tThe center of the screen on x-axis is 'x=(ow-iw)/2\n\n"

        printf " -c | --colour <COLOUR>\n"
        printf "\tColour to use for the padding. See https://ffmpeg.org/ffmpeg-utils.html#color-syntax\n"
        printf "\tCan use a word 'Aqua, Beige, Cyan, etc...', the word 'random' or hex code : RRGGBB[AA] \n\n"

        printf " -g | --grep <STRING>\n"
        printf "\tSupply a grep string for filtering the inputs if a folder is specified.\n\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n\n"

        printf "Examples:\n\n"
        printf "\tPadding all around the video.\n"
        printf "\t./ff_pad.sh -i input.mp4 -h 'ih*2' -w 'iw*2'\n\n"

        printf "\tVideo Pad white background.\n"
        printf "\t./ff_pad.sh -i input.mp4 -h 'ih*2' -c white\n\n"

        printf "\tMake black bars..\n"
        printf "\t/ff_pad.sh -i input.mp4 -w iw -h ih+100 -y '(oh-ih)/2' -x '(ow-iw)/2' -c #000000\n"

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


        -w|--width)
            WIDTH="$2"
            shift 
            shift
            ;;


        -h|--height)
            HEIGHT="$2"
            shift 
            shift
            ;;


        -x|--xpixels)
            XPIXELS="$2"
            shift 
            shift
            ;;


        -y|--ypixels)
            YPIXELS="$2"
            shift 
            shift
            ;;


        -c|--colour)
            COLOUR="$2"
            shift 
            shift
            ;;


        -C|--config)
            CONFIG_FILE="$2"
            shift 
            shift
            ;;


        -g|--grep)
            GREP="$2"
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
    printf "📏 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Width" "$WIDTH"
    printf "📐 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Height" "$HEIGHT"
    printf "⏩ ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "XPixels" "$XPIXELS"
    printf "⏫ ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "YPixels" "$YPIXELS"
    printf "🌈 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Colour" "$COLOUR"
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

        ffmpeg -y -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf "pad=width=${WIDTH}:height=${HEIGHT}:x=${XPIXELS}:y=${YPIXELS}:color=${COLOUR}" ${OUTPUT_FILENAME}
        
        printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"
    fi

    # If this is a drectory
    if [ -d "$INPUT_FILENAME" ]; then
        LOOP=0
        LIST_OF_FILES=$(find $INPUT_FILENAME -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | grep "$GREP")
        for INPUT_FILENAME in $LIST_OF_FILES
        do
            pre_flight_checks $INPUT_FILENAME

            ffmpeg -y -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf "pad=width=${WIDTH}:height=${HEIGHT}:x=${XPIXELS}:y=${YPIXELS}:color=${COLOUR}" ${LOOP}_${OUTPUT_FILENAME}
                
            printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "${LOOP}_${OUTPUT_FILENAME}"
            LOOP=$(expr $LOOP + 1)
        done
    fi

}

usage $@
arguments $@
read_config "$@"
main $@