#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │             Change the scale (physical dimensions) of the video              │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# https://ottverse.com/change-resolution-resize-scale-video-using-ffmpeg/


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
OUTPUT_FILENAME="ff_scale.mp4"
WIDTH="1920"
HEIGHT="1080"
LOGLEVEL="error" 
GREP=""
DAR="16/9"
SAR="1/1"

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-w <WIDTH>] [-h <HEIGHT>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Change the scale (Width/Height) of a video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file. Default: input.mp4\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -w | --width <PIXELS>\n"
        printf "\tThe width of the video. The default value is 1920.\n"
        printf "\t-1 : keep aspect ratio.\n\n"
        printf "\t-n : aspect ratio a multiple of n. (-2 is even numbers)\n"
        printf "\tiw : input width.\n"
        printf "\tih : input height.\n"
        printf "\tiw*.5 : input width divided by 0.5 (half width).\n\n"

        printf " -h | --height <PIXELS>\n"
        printf "\tThe height of the video. The default value is 1080.\n"
        printf "\t-1 : keep aspect ratio.\n\n"
        printf "\t-n : aspect ratio a multiple of n.\n"
        printf "\tiw : input width.\n"
        printf "\tih : input height.\n"
        printf "\tiw*.5 : input width divided by 0.5 (half width).\n\n"

        printf " -d | --sar <SAR>\n"
        printf "\tSet the SAR. (Display Aspect Ratio - dimensions of the image) Default is 16/9.\n\n"

        printf " -d | --dar <DAR>\n"
        printf "\tSet the DAR. (Sample Aspect Ratio - dimensions of a pixel) Default is 1/1.\n\n"

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


        -d|--dar)
            DAR="$2"
            shift 
            shift
            ;;


        -s|--sar)
            SAR="$2"
            shift 
            shift
            ;;


        -l|--loglevel)
            LOGLEVEL="$2"
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


        --description)              # IGNORED. used for descriptions in JSON 
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

    # Print to screen
    printf "🎛️  Config Flags: %s\n" "$LIST_OF_INPUTS"

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
    exit 1
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

    if ! command -v ffprobe &> /dev/null
    then
        echo "ffprobe could not be found"
        exit
    fi

    if ! command -v ffmpeg &> /dev/null
    then
        echo "ffmpeg could not be found"
        exit
    fi


    # Check input filename is a movie file.
    if ffprobe "${INPUT_FILE}" > /dev/null 2>&1; then
        printf "\t" 
    else
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILE}"
        ffprobe "${INPUT_FILE}"
        exit_gracefully
    fi
}



# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    printf "%-80s\n" "📐 ff_scale.sh - Changing the size of the video. "

    # If this is a file
    if [ -f "$INPUT_FILENAME" ]; then
        pre_flight_checks $INPUT_FILENAME

        ffmpeg -y -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,setdar=${DAR},setsar=${SAR} ${OUTPUT_FILENAME}
        
        printf "✅ %-20s\n" "${OUTPUT_FILENAME}"
    fi

    # If this is a drectory
    if [ -d "$INPUT_FILENAME" ]; then
        LOOP=0
        LIST_OF_FILES=$(find $INPUT_FILENAME -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | grep "$GREP")
        for INPUT_FILENAME in $LIST_OF_FILES
        do
            pre_flight_checks $INPUT_FILENAME

            ffmpeg -y -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,setdar=${DAR},setsar=${SAR} ${LOOP}_${OUTPUT_FILENAME}
                
            printf "✅ %-20s\n" "${LOOP}_${OUTPUT_FILENAME}"
            LOOP=$(expr $LOOP + 1)
        done
    fi

}

echo "args: $@"

usage $@
arguments $@
read_config "$@"
main $@