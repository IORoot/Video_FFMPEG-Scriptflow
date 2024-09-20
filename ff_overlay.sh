#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │              Overlay a video at specific time on the video                    │
# │              Allows for transparent videos and animations                    │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi           # DEBUG=1 will show debugging.



# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.mp4"
OUTPUT_FILENAME="ff_overlay.mp4"
RESIZED_OVERLAY="ff_resized_overlay.mp4"
OVERLAY=""
LOGLEVEL="error"
START="0"
END="3"

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
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -v <OVERLAY_FILE> [-S <START>] [-E <END>] [-x <PIXELS>] [-y <PIXELS>] [-s <SCALE>] [-a <ALPHA>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

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

        printf " -f | --fit\n"
        printf "\nScale the overlay to fit the input video.\n"

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
            INPUT_FILENAME=$(realpath $2)
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -v|--overlay)
            OVERLAY=$(realpath $2)
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
       
        
        -f|--fit)
            FIT="TRUE"
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

    # Check input filename is a movie file.
    if ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${INPUT_FILENAME}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILE}"
        ffprobe "${INPUT_FILE}"
        exit_gracefully
    fi
}

function print_flags()
{
    printf "📑 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Overlay" "$OVERLAY"
    printf "🏁 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Start" "$START"
    printf "🎬 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "End" "$END"
}


function resize_overlay_to_fit()
{

    # Get video info
    video_info=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,sample_aspect_ratio,codec_name -of default=noprint_wrappers=1:nokey=1 "$INPUT_FILENAME")

    # Extract audio codec information
    audio_codec=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$INPUT_FILENAME")

    # Parse video information into variables
    video_codec=$(echo "$video_info" | sed -n '1p')
    width=$(echo "$video_info" | sed -n '2p')
    height=$(echo "$video_info" | sed -n '3p')
    sar=$(echo "$video_info" | sed -n '4p' | sed 's/:/\//')
    fps=$(echo "$video_info" | sed -n '5p' | cut -d '/' -f 1)

    ffmpeg -v "$LOGLEVEL" -i "$OVERLAY" -vf "scale=$width:$height" "$RESIZED_OVERLAY"
}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    pre_flight_checks

    if [[ -z "${OVERLAY}" ]]; then 
        printf "❌ No overlay file specified. Exiting.\n"
        exit_gracefully
    fi

    if [[ ! -z "${FIT}" ]]; then 
        resize_overlay_to_fit
        # Switch to use the new resized version
        OVERLAY=$RESIZED_OVERLAY
    fi

    print_flags

    # With Alpha
    ffmpeg -v ${LOGLEVEL} -i ${INPUT_FILENAME} -i ${OVERLAY} -filter_complex "[1:v]setpts=PTS-STARTPTS+${START}/TB[ovr];[0:v][ovr]overlay=enable='between(t,${START},${END})'" -pix_fmt yuv420p -c:a copy ${OUTPUT_FILENAME}

    # output
    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@