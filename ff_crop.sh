#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                                Crop the video                                │
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

OUTPUT_FILENAME="output_crop.mp4"
LOGLEVEL="error" 
WIDTH="300"
HEIGHT="300"
XPIXELS="(iw-ow)/2"
YPIXELS="(ih-oh)/2"

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Change the dimensions of the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"


        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"


        printf " -w | --width <WIDTH>\n"
        printf "\tWidth of the output video. Default: 300px.\n\n"


        printf " -h | --height <HEIGHT>\n"
        printf "\tHeight of the output video. Default: 300px.\n\n"


        printf " -x | --xpixels <PIXELS>\n"
        printf "\tWhere to position the video in the frame on X-Axis from left. Default center: (iw-ow)/2\n\n"


        printf " -y | --ypixels <PIXELS>\n"
        printf "\tWhere to position the video in the frame on Y-Axis from top. Default center: (ih-oh)/2\n\n"
        printf "\tThe width, height, x and y parameters also have access to the following variables:\n"
        printf "\t- iw : The input video's width.\n"
        printf "\t- ih : The input video's height.\n"
        printf "\t- ow : The output video's width.\n"
        printf "\t- oh : The output video's height.\n"
        printf "\tThese can be used to calculate areas of the screen. For example:\n"
        printf "\tThe center of the screen on x-axis is 'x=(ow-iw)/2\n\n"


        printf " -c | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n\n"

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


        -c|--config)
            CONFIG_FILE="$2"
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
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    printf "This will crop the video.\n"

    if [[ -z "${INPUT_FILENAME}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit 1
    fi

    printf "🌾 Crop around the video.\n"

    ffmpeg  -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf "crop=w=${WIDTH}:h=${HEIGHT}:x=${XPIXELS}:y=${YPIXELS}" ${OUTPUT_FILENAME}

    printf "✅ New video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@