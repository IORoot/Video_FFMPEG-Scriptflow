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

# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# DIAGRAM
#
#                   | 'OVERLAY_START_TIME' = start overlay at 0.  
#                   |
#                   |                                             | 'DURATION' = 5 seconds.
#                   |                                             |
#                   |                                             |
#                   |                                             |
#                   ╭─────────────────────────────────────────────╮
#                   │ OVERLAY (5 seconds long)                    │
#                   0────────1────────2────────3────────4────────5╯
#                   |                                             |
#                   | 'START' = 2 seconds in on input video       | 'END' = 7 seconds.
#                   |                                             |
#                   |                                             |
#                   |                                             |
#                   |                                             |
# ╭────────────────────────────────────────────────────────────────────────╮
# │ INPUT VIDEO (8 seconds long)                                           │
# 0────────1────────2────────3────────4────────5────────6────────7────────8╯



# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.mp4"
OUTPUT_FILENAME="ff_watermark.mp4"
XPIXELS="10"
YPIXELS="10"
LOGLEVEL="error"
SCALE="0.2" 
ALPHA="1" 
OVERLAY_START_TIME="0"      # Where the overlay video should start playing from. Default is from the start (0).
START="0"
END="100%"


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

        printf " -S | --start <SECONDS>\n"
        printf "\tStart time in seconds of when to show overlay. Default 0.\n"
        printf "\tYou can also express with basic maths and percentage values.\n"
        printf "\tExamples:\n"
        printf "\t\"10\" : Start 10 seconds into the input video. \n"
        printf "\t\"50%\" : Start half way through the input video. \n"
        printf "\t\"100%-5\" : Start 5 seconds before the end of the input video. \n"
        printf "\t\"10%+12\" : Start 12 seconds after the 10% mark of the input video. \n"
        printf "\t\"-5\" : Start 5 seconds before the beginning of the input video. \n"

        printf " -E | --end <SECONDS>\n"
        printf "\nEnd time in seconds of when to show overlay. Default 100%\n"
        printf "\nYou can also use basic maths and percentage values the same as the --start flag.\n"

        printf " -D | --duration <SECONDS>\n"
        printf "\nOverride the --end time with a duration instead. Default is unset (null)\n"

        printf " -C | --config <CONFIG_FILE>\n"
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
            INPUT_FILENAME=$(realpath "$2")
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -w|--watermark)
            WATERMARK_FILE=$(realpath "$2")
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


        -D|--duration)
            DURATION="$2"
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


    # Send to the arguments function again to override.
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
    # Check input filename has been set.
    if [[ -z "${INPUT_FILENAME+x}" ]]; then 
        printf "\t❌ No input file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check input file exists.
    if [ ! -f "$INPUT_FILENAME" ]; then
        printf "\t❌ Input file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check watermark filename has been set.
    if [[ -z "${WATERMARK_FILE}" ]]; then 
        printf "\t❌ No watermark file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check watermark file exists.
    if [ ! -f "$WATERMARK_FILE" ]; then
        printf "\t❌ Watermark file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check input filename is a movie file.
    if ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${INPUT_FILENAME}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILE}"
        ffprobe "${INPUT_FILE}"
        exit_gracefully
    fi
}



# ╭──────────────────────────────────────────────────────────╮
# │           Start and end times for the overlay            │
# ╰──────────────────────────────────────────────────────────╯
calculate_times()
{

    # detect the length of the main input video
    # will be in seconds and milliseconds. e.g. 32.23442
    LENGTH_OF_INPUT_VIDEO=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${INPUT_FILENAME}")
    INPUT_LENGTH=${LENGTH_OF_INPUT_VIDEO%%.*}
    # If contains a % symbol
    REGEX="([0-9]|[1-9][0-9]|100)%"
    if [[ $START =~ $REGEX ]]; then
        # Get the percent value
        PERCENT=${BASH_REMATCH[0]}
        # remove the % symbol
        PERCENT_NO_SYMBOL=${PERCENT%?}
        # calculate the actual time of that percentage along the input video.
        PERCENT_TIME=$(( $INPUT_LENGTH*$PERCENT_NO_SYMBOL/100 ))
        # Substitute the original percentage value for the time value.
        SUBSTITUTE_PERCENT_FOR_REAL_TIME=${START//${BASH_REMATCH[1]}%/$PERCENT_TIME}
        # calculate any maths (including -5, +5%, /2, etc...)
        START=$(( $SUBSTITUTE_PERCENT_FOR_REAL_TIME ))
    fi

    # Repeat for the END entry.
    if [[ $END =~ $REGEX ]]; then
        PERCENT=${BASH_REMATCH[0]}
        PERCENT_NO_SYMBOL=${PERCENT%?}
        PERCENT_RESULT=$(( $INPUT_LENGTH*$PERCENT_NO_SYMBOL/100 ))
        SUBSTITUTE_PERCENT_FOR_REAL_TIME=${END//${BASH_REMATCH[1]}%/$PERCENT_RESULT}
        END=$(( $SUBSTITUTE_PERCENT_FOR_REAL_TIME ))
    fi

    # duration of the overlay video to play (if not already set)
    if [[ -z ${DURATION+x} ]]; then
        DURATION=$(( $END - $START ))
    fi

    

    # Set the overlay playing duration.
    ENABLE=":enable='between(t,${OVERLAY_START_TIME},${END})'"
}

function print_flags()
{
    printf "🌁 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Watermark" "$WATERMARK_FILE"
    printf "🔳 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "XPixels" "$XPIXELS"
    printf "🔳 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "YPixels" "$YPIXELS"
    printf "🏋️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Scale" "$SCALE"
    printf "🔲 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Alpha" "$ALPHA"
    printf "🏁 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Start" "$START"
    printf "🎬 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "End" "$END"
    printf "⏲️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Duration" "$DURATION"
}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    pre_flight_checks

    # If a wildcard is used get a random result
    # "./lib/watermarks/youth_box_RANDOM.png"
    if [[ ${WATERMARK_FILE} =~ .*RANDOM.* ]]; then
        WATERMARK_FILE=$(realpath ${WATERMARK_FILE//RANDOM/*} | sort -R | head -n 1)
    fi

    calculate_times

    print_flags

    ffmpeg -v ${LOGLEVEL} -i ${INPUT_FILENAME} -i "${WATERMARK_FILE}" -filter_complex "[1]setpts=PTS-STARTPTS+${START}/TB,format=rgba,colorchannelmixer=aa=${ALPHA}[logo];[logo][0]scale2ref=oh*mdar:ih*${SCALE}[logo][video];[video][logo]overlay=${XPIXELS}:${YPIXELS}${ENABLE}" ${OUTPUT_FILENAME}

    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@