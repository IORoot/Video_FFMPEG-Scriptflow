#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                       Overlay a watermark on the video                       │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# https://www.bannerbear.com/blog/how-to-add-watermark-to-videos-using-ffmpeg/

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

OUTPUT_FILENAME="output_watermarked.mp4"
XPIXELS="10"
YPIXELS="10"
LOGLEVEL="error"
SCALE="0.2" 
ALPHA="1" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -w <WATERMARK_FILE> [-x <PIXELS>] [-y <PIXELS>] [-s <SCALE>] [-a <ALPHA>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Overlay a watermark on the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -w | --watermark <WATERMARK_FILE>\n"
        printf "\tNote that you CAN use videos as the watermark.\n"
        printf "\tImage to use for the watermark.\n\n"

        printf " -x | --xpixels <PIXELS>\n"
        printf "\tPosition of the watermark. Number of pixels on X-Axis. Default 10.\n"
        printf "\tThere are variables that also can be used:\n"
        printf "\t- (W) is the width of the video\n"
        printf "\t- (H) is the height of the video\n"
        printf "\t- (w) is the width of the watermark\n"
        printf "\t- (h) is the height of the watermark\n"
        printf "\tThe following example will center the watermark:\n"
        printf "\tff_watermark -i input.mp4 -w watermark.png -x \"(W-w)/2\" -y \"(H-h)/2\" \n\n"

        printf " -y | --ypixels <PIXELS>\n"
        printf "\tPosition of the watermark. Number of pixels on Y-Axis. Default 10.\n\n"

        printf " -s | --scale <SCALE>\n"
        printf "\tSize of the watermark in relation to the height of the video. Default is 0.2 (1/5th height)\n\n"

        printf " -a | --alpha <ALPHA>\n"
        printf "\tTransparency (alpha channel) of the watermark. From 0 to 1. Default is 1.\n\n"

        printf " -c | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n\n"

        printf "Examples:\n\n"

        printf "Center large watermark:\n"
        printf "ff_watermark -i input.mp4 -w watermark.png -s 0.4 -x \"(W-w)/2\" -y \"(H-h)/2\"\n\n"

        printf "Small bottom right watermark:\n"
        printf "ff_watermark -i input.mp4 -w watermark.png -s 0.1 -x \"(W-w)\" -y \"(H-h)\"\n\n"

        printf "Full-size watermark:\n"
        printf "ff_watermark -i input.mp4 -w watermark.png -s 1\n\n"

        printf "Full-size semi-transparent watermark:\n"
        printf "ff_watermark -i input.mp4 -w watermark.png -s 1 -a 0.5\n\n"

        printf "Small, transparent bottom-right positioned Video as a watermark:\n"
        printf "ff_watermark -i input.mp4 -w watermark_video.mp4 -s 0.3 -x \"(W-w)\" -y \"(H-h)\" -a 0.5\n\n"
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


        -w|--watermark)
            WATERMARK_FILE="$2"
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


        -s|--scale)
            SCALE="$2"
            shift 
            shift
            ;;


        -a|--alpha)
            ALPHA="$2"
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

    printf "This will overlay a watermark on the video.\n"

    if [[ -z "${INPUT_FILENAME}" ]]; then 
        printf "❌ No input file specified. Exiting.\n"
        exit 1
    fi

    if [[ -z "${WATERMARK_FILE}" ]]; then 
        printf "❌ No watermark file specified. Exiting.\n"
        exit 1
    fi

    printf "🎨 Overlaying the watermark.\n" "$WATERMARK_FILE" 

    ffmpeg -v ${LOGLEVEL} -i ${INPUT_FILENAME} -i "${WATERMARK_FILE}" -filter_complex "[1]format=rgba,colorchannelmixer=aa=${ALPHA}[logo];[logo][0]scale2ref=oh*mdar:ih*${SCALE}[logo][video];[video][logo]overlay=${XPIXELS}:${YPIXELS}" ${OUTPUT_FILENAME}

    printf "✅ New video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@