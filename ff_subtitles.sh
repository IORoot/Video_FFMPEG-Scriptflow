#!/bin/bash
# ╭───────────────────────────────────────────────────────────────────────────╮
# │                                                                           │
# │                       Embed subtitles over a video                        │
# │                                                                           │
# ╰───────────────────────────────────────────────────────────────────────────╯

# More information : https://aegisub.org/docs/3.2/ASS_Tags/

# FontName: Specifies the font name or family for the subtitles.
# force_style='FontName=Arial'

# FontSize: Sets the font size for the subtitles.
# force_style='FontSize=24'

# PrimaryColour: Specifies the color of the subtitles' text.
# force_style='PrimaryColour=&H00FF00' # Green color

# SecondaryColour: Specifies the color of the subtitles' secondary text.
# force_style='SecondaryColour=&HFFFF00' # Yellow color

# OutlineColour: Specifies the color of the outline of the subtitles' text.
# force_style='OutlineColour=&H55000000' # Semi-transparent black outline

# BackColour: Specifies the background color behind the subtitles' text.
# force_style='BackColour=&H55000000' # Semi-transparent black background

# Bold: Enables or disables bold text style for the subtitles.
# force_style='Bold=1' # Enable bold

# Italic: Enables or disables italic text style for the subtitles.
# force_style='Italic=1' # Enable italic

# Underline: Enables or disables underline text style for the subtitles.
# force_style='Underline=1' # Enable underline

# StrikeOut: Enables or disables strikeout text style for the subtitles.
# force_style='StrikeOut=1' # Enable strikeout

# ScaleX: Scales the width of the subtitles' text.
# force_style='ScaleX=1.5' # Scale width by 1.5

# ScaleY: Scales the height of the subtitles' text.
# force_style='ScaleY=1.5' # Scale height by 1.5

# Spacing: Adjusts the spacing between characters in the subtitles.
# force_style='Spacing=2' # Increase spacing by 2 pixels

# Angle: Specifies the angle of rotation for the subtitles' text.
# force_style='Angle=45' # Rotate text by 45 degrees

# BorderStyle: Sets the style of the border around the subtitles' text.
# force_style='BorderStyle=3' # Drop shadow border style

# Outline: Sets the width of the outline around the subtitles' text.
# force_style='Outline=2' # Set outline width to 2 pixels

# Shadow: Sets the distance and angle of shadow for the subtitles' text.
# force_style='Shadow=2,2,black' # Shadow offset (2 pixels horizontal, 2 pixels vertical) and color (black)

# Alignment: Specifies the alignment of the subtitles within their bounding box.
# force_style='Alignment=6' # Middle center alignment

# MarginL: Sets the left margin for the subtitles.
# force_style='MarginL=10' # Set left margin to 10 pixels

# MarginR: Sets the right margin for the subtitles.
# force_style='MarginR=10' # Set right margin to 10 pixels

# MarginV: Sets the vertical margin for the subtitles.
# force_style='MarginV=10' # Set vertical margin to 10 pixels

# AlphaLevel: Sets the transparency level for the subtitles' text.
# force_style='AlphaLevel=50' # Set transparency to 50%

# Encoding: Specifies the character encoding used for the subtitles.
# force_style='Encoding=1' # Set character encoding to Unicode (UTF-16LE)


# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.



# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME=""
SUBTITLE_FILENAME=""
OUTPUT_FILENAME="ff_subtitle.mp4"
LOGLEVEL="error"  
ASS_FILE="subtitles.ass"

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
        printf "ℹ️ Usage:\n $0 -i <INPUT_FILE> -s <SUBTITLE_FILENAME> -f <FORCED_STYLE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Overlay an audio file on the video.\n\n"

        printf "Flags:\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file.\n\n"

        printf " -s | --subtitles <INPUT_FILE>\n"
        printf "\tThe name of an subtitle SRT file.\n\n"

        printf " -f | --styles <FORCE_STYLE>\n"
        printf "\tThe Forced Style for the subtitles.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

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
            INPUT_FILENAME=$(realpath "$2")
            shift
            shift
            ;;


        -s|--subtitles)
            SUBTITLE_FILENAME=$(realpath "$2")
            shift
            shift
            ;;


        -f|--style)
            STYLE="$2"
            shift 
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
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
# │         Read config-file if supplied. Requires JQ          │
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
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILENAME}"
        ffprobe "${INPUT_FILENAME}"
        exit_gracefully
    fi

    # Check subtitle filename has been set.
    if [[ -z "${SUBTITLE_FILENAME+x}" ]]; then 
        printf "\t❌ No subtitle file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check subtitle file exists.
    if [ ! -f "$SUBTITLE_FILENAME" ]; then
        printf "\t❌ subtitle file not found. Exiting.\n"
        exit_gracefully
    fi
}

function print_flags()
{
    printf "💬 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Subtitle File" "$SUBTITLE_FILENAME"
    printf "🙋‍♀️ ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Video Height" "$HEIGHT"
    printf "🎨 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Style" "$STYLE"
}

function get_height_width()
{
    # Get the height of the video
    HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=s=x:p=0 ${INPUT_FILENAME} )
    HALF_HEIGHT=$(( ${HEIGHT} / 2 ))

    # If MarginV contains "h-", calculate the actual MarginV
    if [[ $STYLE == *MarginV=h-* ]]; then
        # Extract the value after "h-" from MarginV
        margin_value=${STYLE#*MarginV=h-}
        
        # Calculate the actual MarginV
        margin_v=$((HALF_HEIGHT - margin_value))
        
        # Replace the original MarginV with the calculated value
        STYLE=${STYLE/MarginV=h-$margin_value/MarginV=$margin_v}
    fi

}
# ╭───────────────────────────────────────────────────────╮
# │                                                       │
# │     ASS Files have more ability to change styles      │
# │                                                       │
# ╰───────────────────────────────────────────────────────╯
function convert_to_ass_file()
{
    ffmpeg -i ${SUBTITLE_FILENAME} ${ASS_FILE}
}


# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    pre_flight_checks

    convert_to_ass_file

    get_height_width

    print_flags

    ffmpeg -v ${LOGLEVEL} -i ${INPUT_FILENAME} -vf "subtitles=${ASS_FILE}:force_style='${STYLE}'" ${OUTPUT_FILENAME} 
    
    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"

    rm $ASS_FILE

}

usage $@
arguments $@
read_config "$@"
main $@