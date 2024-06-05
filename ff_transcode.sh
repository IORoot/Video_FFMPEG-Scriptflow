#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                  Transcode multiple files to same format                      │
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
OUTPUT_FILENAME="ff_transcode.mp4" 
VIDEO_CODEC="libx264"
AUDIO_CODEC="aac"
FPS="30"
SAR="1:1"
DAR="16:9"
GREP=""
TARGET_WIDTH="1920"
TARGET_HEIGHT="1080"

LOGLEVEL="error"                                           

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
        printf "ℹ️ Usage:\n $0 -o <OUTPUT_FILE> -i <INPUT_FILE> -i <INPUT_FILE> [ -i <INPUT_FILE3>...] [-l loglevel]\n\n" >&2 

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tThe name of the output file. Specify only one.\n\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file or folder.\n\n"

        printf " -g | --grep <GREP>\n"
        printf "\tSupply a grep string for filtering the inputs if a folder is specified.\n\n"

        printf " -v | --video <VIDEO_CODEC>\n"
        printf "\tThe video codec to convert all files to. [default libx264]\n\n"

        printf " -a | --audio <AUDIO_CODEC>\n"
        printf "\tThe audio codec to convert all files to. [default aac]\n\n"

        printf " -f | --fps <FPS>\n"
        printf "\tThe Frames Per Second to convert all files to. [default 30]\n\n"

        printf " -s | --sar <SAR>\n"
        printf "\tThe Sample Aspect Ratio to convert all files to.\n\n"

        printf " -d | --dar <DAR>\n"
        printf "\tThe Display Aspect Ratio to convert all files to.\n\n"

        printf " -w | --width <WIDTH>\n"
        printf "\tThe width to convert all files to. [default 1920]\n\n"

        printf " -h | --height <HEIGHT>\n"
        printf "\tThe height to convert all files to. [default 1080]\n\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

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

            
        -g|--grep)
            GREP="$2"
            shift 
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -v|--video)
            VIDEO_CODEC="$2"
            shift 
            shift
            ;;


        -a|--audio)
            AUDIO_CODEC="$2"
            shift 
            shift
            ;;


        -f|--fps)
            FPS="$2"
            shift 
            shift
            ;;


        -s|--sar)
            SAR="$2"
            shift 
            shift
            ;;


        -d|--dar)
            DAR="$2"
            shift 
            shift
            ;;


        -w|--width)
            TARGET_WIDTH="$2"
            shift 
            shift
            ;;

    
        -h|--height)
            TARGET_HEIGHT="$2"
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
# │     Run these checks before you run the main script      │
# ╰──────────────────────────────────────────────────────────╯
function pre_flight_checks()
{
    INPUT_FILE=$1

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



# ╭──────────────────────────────────────────────────────────╮
# │        Read config-file if supplied. Requires JQ           │
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
    exit 0
}



# ╭───────────────────────────────────────────────────────╮
# │             Transcode to common filetype               │
# ╰───────────────────────────────────────────────────────╯
function transcode_file() 
{
    INPUT_FILE=$1
    OUTPUT_FILE=$2

    # Get video dimensions
    dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$INPUT_FILE")
    width=$(echo "$dimensions" | cut -d 'x' -f1)
    height=$(echo "$dimensions" | cut -d 'x' -f2)

    # Calculate padding to maintain aspect ratio
    if [ "$height" -gt "$width" ]; then
        scale="iw*sar*min($TARGET_WIDTH/(iw*sar)\,$TARGET_HEIGHT/ih):ih*min($TARGET_WIDTH/(iw*sar)\,$TARGET_HEIGHT/ih)"
        pad="($TARGET_WIDTH-iw*min($TARGET_WIDTH/iw\,$TARGET_HEIGHT/ih))/2:($TARGET_HEIGHT-ih*min($TARGET_WIDTH/iw\,$TARGET_HEIGHT/ih))/2"
    else
        scale="min(iw\,$TARGET_WIDTH):min(ih\,$TARGET_HEIGHT)"
        pad="($TARGET_WIDTH-iw)/2:($TARGET_HEIGHT-ih)/2"
    fi


    # Add black background and resize using pad filter
    ffmpeg -v ${LOGLEVEL} -i "$INPUT_FILE" -vf "scale=$scale,pad=$TARGET_WIDTH:$TARGET_HEIGHT:$pad:black" \
    -c:v $VIDEO_CODEC -c:a $AUDIO_CODEC -r $FPS "$OUTPUT_FILE"

}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
# ╭──────────────────────────────────────────────────────────╮
# │          Run FFMPEG against the temporary file           │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    if [ -f "$INPUT_FILENAME" ]; then
        pre_flight_checks "$INPUT_FILENAME"
        transcode_file "$INPUT_FILENAME" "$OUTPUT_FILENAME"
        printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"


    elif [ -d "$INPUT_FILENAME" ]; then
        LOOP=0
        LIST_OF_FILES=$(find "$INPUT_FILENAME" -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | grep "$GREP")

        for INPUT_FILE in $LIST_OF_FILES; do
            OUTPUT_FILEPATH="./${LOOP}_${OUTPUT_FILENAME}"
            pre_flight_checks "$INPUT_FILE"
            transcode_file "$INPUT_FILE" "$OUTPUT_FILEPATH"
            printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILEPATH"
            LOOP=$((LOOP + 1))
        done


    else
        echo "Input path is neither a file nor a directory: $INPUT_FILENAME"
        exit 1
    fi

}


# Run the main functions passing all parameters in.
usage $@
setup
arguments $@
read_config "$@"
main $@