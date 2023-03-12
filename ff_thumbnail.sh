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

set -o errexit                                              # If a command fails bash exits.
set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.
cd "$(dirname "$0")"                                        # Change to the script folder.

# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯

OUTPUT_FILENAME="output_thumbnail.png"
COUNT="3"
SAMPLE="300"
LOGLEVEL="error" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Create thumbnails representative of the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"


        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output image file.\n\n"


        printf " -c | --count <COUNT>\n"
        printf "\tThe number of thumbnails to create. The default value is 1.\n"
        printf "\tUses a batch sample size of 300 frames. If there are less frames than the count, you will get less thumbnails.\n"


        printf " -s | --sample <SAMPLE>\n"
        printf "\tThe batch sample sizee. The default value is 300.\n"
        printf "\tSize of the number of frames to analyse to create a thumbnail from. Each thumbnail will use the next batch.\n"


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
            INPUT_FILENAME="$2"
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -c|--count)
            COUNT="$2"
            shift 
            shift
            ;;


        -s|--sample)
            SAMPLE="$2"
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
    exit 0
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
        exit_gracefully
    fi

    printf "🌄 Generating thumbnail. "

    # ffmpeg  -vf scale=${WIDTH}:${HEIGHT} ${OUTPUT_FILENAME}

    DIRECTORY=$(dirname "$OUTPUT_FILENAME")
    # printf "DIRECTORY: %s\n" "$DIRECTORY"

    FILENAME=$(basename -- "$OUTPUT_FILENAME")
    # printf "FILENAME: %s\n" "$FILENAME"

    EXTENSION="${FILENAME##*.}"
    # printf "EXTENSION: %s\n" "$EXTENSION"

    FILENAME="${FILENAME%.*}"
    # printf "FILENAME: %s\n" "$FILENAME"

    ffmpeg -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf "thumbnail=${SAMPLE}" -frames:v ${COUNT} -vsync vfr ${DIRECTORY}/${FILENAME}-%02d.${EXTENSION}

    printf "✅ %s\n" "${DIRECTORY}/${FILENAME}-%02d.${EXTENSION}"

}

usage $@
arguments $@
read_config "$@"
main $@