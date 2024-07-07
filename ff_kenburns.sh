#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────╮
# │                                                                          │░
# │        Create a Ken-burns effect with an image to generate video         │░
# │                                                                          │░
# ╰░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░


# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.png"
OUTPUT_FILENAME="ff_kenburns.mp4"
LOGLEVEL="error" 
FPS="30" 
CROP_WIDTH="1024" 
CROP_HEIGHT="720" 
DURATION="10" 
ZOOM_SPEED="0.003" 
BITRATE="5000k"
TARGET="TopLeft"

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
    if [ "$#" -lt 1 ]; then
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> [SETTINGS] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "This will generate a video from an image with a ken-burns effect.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of the input file.\n\n"

        printf " -t | --target <TARGET>\n"
        printf "\tThe target of the zoom.\n"
        printf "\tTopLeft    | TopRight.\n"
        printf "\tBottomLeft | BottomRight.\n"
        printf "\tRandom\n\n"

        printf " -f | --fps <FPS>\n"
        printf "\tDefault is %s\n" "${FPS}"
        printf "\tThe Output Frames Per Second.\n\n"

        printf " -w | --width <PIXELS>\n"
        printf "\tDefault is %s\n" "${WIDTH}"
        printf "\tThe output width.\n\n"

        printf " -h | --height <PIXELS>\n"
        printf "\tDefault is %s\n" "${HEIGHT}"
        printf "\tThe output height.\n\n"

        printf " -d | --duration <SECS>\n"
        printf "\tDefault is %s\n" "${DURATION}"
        printf "\tThe output duration in seconds.\n\n"

        printf " -s | --speed <FLOAT>\n"
        printf "\tDefault is %s\n" "${ZOOM_SPEED}"
        printf "\tThe speed of the zoom.\n\n"

        printf " -b | --bitrate <BITRATE>\n"
        printf "\tDefault is %s\n" "${BITRATE}"
        printf "\tThe bitrate of the output file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

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


        -t|--target)
            TARGET="$2"
            shift
            shift
            ;;


        -f|--fps)
            FPS="$2"
            shift
            shift
            ;;


        -w|--width)
            CROP_WIDTH="$2"
            shift
            shift
            ;;


        -h|--height)
            CROP_HEIGHT="$2"
            shift
            shift
            ;;


        -d|--duration)
            DURATION="$2"
            shift
            shift
            ;;


        -s|--speed)
            ZOOM_SPEED="$2"
            shift
            shift
            ;;


        -b|--bitrate)
            BITRATE="$2"
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -l|--loglevel)
            LOGLEVEL="$2"
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
# │   Exit the app by just skipping the ffmpeg processing.   │
# │            Then copy the input to the output.            │
# ╰──────────────────────────────────────────────────────────╯
function exit_gracefully()
{
    cp -f ${INPUT_FILENAME} ${OUTPUT_FILENAME}
    exit 1
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
# │     Run these checks before you run the main script      │
# ╰──────────────────────────────────────────────────────────╯
function pre_flight_checks()
{

    # Check input file exists.
    if [ ! -f "$INPUT_FILENAME" ]; then
        printf "\t❌ First file not found. Exiting.\n"
        exit_gracefully
    fi

}

function calculate_variables()
{

    IMAGE_WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$INPUT_FILENAME")
    IMAGE_HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$INPUT_FILENAME")

    # Determine x and y values based on the position
    case "$TARGET" in
        TopLeft)
            X=0
            Y=0
            ;;
        TopRight)
            X=${IMAGE_WIDTH}
            Y=0
            ;;
        BottomLeft)
            X=0
            Y=${IMAGE_HEIGHT}
            ;;
        BottomRight)
            X=${IMAGE_WIDTH}
            Y=${IMAGE_HEIGHT}
            ;;
        Random)
            X=$(shuf -i 0-${IMAGE_WIDTH} -n 1)
            Y=$(shuf -i 0-${IMAGE_HEIGHT} -n 1)
            ;;
        *)
            echo "Invalid position: $TARGET"
            echo "Valid positions are: TopLeft, TopRight, BottomLeft, BottomRight, Random"
            exit 1
            ;;
    esac


    # Calculate the duration in frames
    DURATION_FRAMES=$((DURATION * FPS))

    # Scale filter to resize the image (not used for cropping)
    SCALE_FILTER="scale=${IMAGE_WIDTH}:${IMAGE_HEIGHT}"

    # Set sample aspect ratio filter
    SETSAR_FILTER="setsar=1:1"

    # Crop filter to ensure the output matches the specified dimensions
    CROP_X=$(( ($IMAGE_WIDTH - $CROP_WIDTH) / 2 ))
    CROP_Y=$(( ($IMAGE_HEIGHT - $CROP_HEIGHT) / 2 ))
    CROP_FILTER="crop=${CROP_WIDTH}:${CROP_HEIGHT}"

    # Zoom expression to incrementally increase zoom
    ZOOM="zoom+${ZOOM_SPEED}"

    # Output dimensions for the zoompan filter
    SIZE="${CROP_WIDTH}x${CROP_HEIGHT}"

    # Combine the zoompan filter components into one filter
    ZOOMPAN_FILTER="zoompan=z=${ZOOM}:x=${X}:y=${Y}:d=${DURATION_FRAMES}:s=${SIZE}:fps=${FPS}"

    # Smooth scale
    SMOOTH_SCALE="scale=8000:-1"

    # Combine all filters into filter_complex
    FILTER_COMPLEX="[0]${SCALE_FILTER},${SETSAR_FILTER}[out];[out]${CROP_FILTER}[out];[out]${SMOOTH_SCALE},${ZOOMPAN_FILTER}[out]"

}


function print_flags()
{
    printf "🏞️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Input File" "$INPUT_FILENAME"
    printf "🏞️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Target" "$TARGET"
    printf "🏞️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "FPS" "$FPS"
    printf "🏞️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Duration" "$DURATION"
    printf "🏞️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Zoom Speed" "$ZOOM_SPEED"
    printf "🏞️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Bitrate" "$BITRATE"
    printf "🏞️  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "IMAGE_WIDTH" "$IMAGE_WIDTH"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "IMAGE_HEIGHT" "$IMAGE_HEIGHT"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "DIMENSIONS" "$DIMENSIONS"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "DURATION_FRAMES" "$DURATION_FRAMES"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "SCALE_FILTER" "$SCALE_FILTER"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "SETSAR_FILTER" "$SETSAR_FILTER"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "X" "$X"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Y" "$Y"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "CROP_WIDTH" "$CROP_WIDTH"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "CROP_HEIGHT" "$CROP_HEIGHT"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "CROP_X" "$CROP_X"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "CROP_Y" "$CROP_Y"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "CROP_FILTER" "$CROP_FILTER"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "ZOOM" "$ZOOM"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "DURATION_FRAMES" "$DURATION_FRAMES"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "SIZE" "$SIZE"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "ZoomPan Filter" "$ZOOMPAN_FILTER"
    printf "🌆  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Filter Complex" "$FILTER_COMPLEX"
}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    pre_flight_checks

    calculate_variables

    print_flags
    
    ffmpeg -loop 1 -i "$INPUT_FILENAME" -y -filter_complex "$FILTER_COMPLEX" -acodec aac -vcodec libx264 -b:v "${BITRATE}" -map [out] -map 0:a? -pix_fmt yuv420p -r "${FPS}" -t "${DURATION}" "${OUTPUT_FILENAME}"
                                                                            
    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@