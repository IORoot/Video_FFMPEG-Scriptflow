#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │              Overlay a video at specific time on the video                   │
# │              Allows for transparent videos and animations                    │
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
OUTPUT_FILENAME="ff_overlay.mp4"
OVERLAY=""
LOGLEVEL="error"
START="0"
END="3"

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -w <OVERLAY_FILE> [-S <START>] [-E <END>] [-x <PIXELS>] [-y <PIXELS>] [-s <SCALE>] [-a <ALPHA>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Overlay a watermark on the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -v | --overlay <OVERLAY_FILE>\n"
        printf "\tNote that you CAN use videos as the overlay.\n"
        printf "\tImage/Video to use for the overlay.\n\n"

        printf " -S | --start <SECONDS>\n"
        printf "\tStart time in seconds of when to show overlay.\n"

        printf " -E | --end <SECONDS>\n"
        printf "\nEnd time in seconds of when to show overlay.\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n\n"

        exit 0
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


        -v|--overlay)
            OVERLAY="$2"
            shift 
            shift
            ;;

        
        -S|--start)
            START="$2"
            shift 
            shift
            ;;
        
        
        -E|--end)
            END="$2"
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

    if [[ -z "${OVERLAY}" ]]; then 
        printf "❌ No overlay file specified. Exiting.\n"
        exit_gracefully
    fi

    printf "🎨 ff_overlay.sh - Overlaying the video (%s)." "$OVERLAY" 

    ffmpeg -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf "movie=${OVERLAY} [a];[a]setpts=PTS-STARTPTS+${START}/TB[top]; [in][top] overlay=0:0:enable='between(t,${START},${END})' [c]" ${OUTPUT_FILENAME}
    
    printf "✅ %s\n" "${OUTPUT_FILENAME}"

}

usage $@
arguments $@
read_config "$@"
main $@