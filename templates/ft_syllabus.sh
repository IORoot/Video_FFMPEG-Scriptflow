#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                            TEMPLATE : SYLLABUS                               │
# │                        Stack with intro and overlays                         │
# │                        Requires: isometric.png                               │
# │                        Requires: glyph.png                                   │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯
# ff_to_landscape
# ff_scale
# ff_grouptime1
# ff_grouptime2
# ff_stack
# ff_lut
# ff_watermark
# output_file
# ff_thumbnail


printf "🎬 Running $0\n"

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

set -o errexit                                              # If a command fails bash exits.
set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.
cd "$(dirname "$0")"                                        # Change to the script folder.

# ╭──────────────────────────────────────────────────────────╮
# │                        DEFAULTS                          │
# ╰──────────────────────────────────────────────────────────╯
OUTPUT_FILENAME="processed_syllabus.mp4"
LOGLEVEL="error" 
CURRENT_DIRECTORY=$(pwd)
LUT="Circinus.cube"
WATERMARK2="./lib/watermarks/ldnpk_white.png"
WATERMARK3="./lib/watermarks/ldnpk_black.png"
WATERMARK4="./lib/watermarks/ldnpk_black.png"
TEXT_COLOUR="#FFFFFF"
TEXT_BACKGROUND="#262626"
MAX_WIDTH="848"
MAX_HEIGHT="480"
TEMP_FOLDER="/tmp"
# ╭──────────────────────────────────────────────────────────╮
# │                     Temporary Files                      │
# ╰──────────────────────────────────────────────────────────╯








# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️  Usage:\n $0 -f <FOLDER> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Use on a folder of video clips. Will stack one video on top of the other.\n\n"

        printf "Flags:\n"

        printf " -f | --folder <FOLDER>\n"
        printf "\tThe path to the folder of video clips.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"

        printf " -c | --config <CONFIG_FILE>\n"
        printf "\A JSON configuration file for all settings.\n\n"

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


        -f|--folder)
            FOLDER="$2"
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


        -c|--config)
            CONFIG_FILE="$2"
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
# │             Test if file is a movie or not               │
# ╰──────────────────────────────────────────────────────────╯
function is_movie_file()
{
    FILE=$1
    if ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${FILE}"; then
        return 0
    else
        return 1
    fi
}



# ╭──────────────────────────────────────────────────────────╮
# │                 Rescale video if too big                 │
# ╰──────────────────────────────────────────────────────────╯
function ff_scale()
{
    CONFIG_FILE="ff_scale.json"
    for FILE in ${FOLDER}/*
    do
        if [ -d "$FILE" ]; then continue; fi
        if [ ! $(is_movie_file $FILE) ]; then continue; fi
        if [ "${FILE: -4}" == ".mov" ];then

            FILENAME=$(realpath $FILE)
            NO_EXTENSION=${FILENAME%????}
            if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
            ../ff_scale.sh -i ${FILENAME} -o ${NO_EXTENSION}.mp4 -w $MAX_WIDTH -h $MAX_HEIGHT $CONFIG_FLAG
            unset CONFIG_FLAG
            mkdir -p $FOLDER/original
            mv $FILENAME $(dirname $FILENAME)/original/$(basename $FILENAME)

        fi

    done
}


# ╭──────────────────────────────────────────────────────────╮
# │               Read folder for input files                │
# ╰──────────────────────────────────────────────────────────╯
function ff_grouptime()
{
    CONFIG_FILE="ff_grouptime.json"
    INPUT_FILE_LIST=""
    for FILE in ${FOLDER}/*
    do
        if [ ! $(is_movie_file $FILE) ]; then continue; fi
        if [ "${FILE: -4}" == ".png" ];then continue; fi
        ABSOLUTE_PATH=$(realpath ${FILE})
        INPUT_FILE_LIST="${INPUT_FILE_LIST} -i $ABSOLUTE_PATH "
    done
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}
GROUPTIME_TEMP_FILE="${TEMP_FOLDER}/temp_grouptime.mp4"


# ╭──────────────────────────────────────────────────────────╮
# │                Make copy to blur and crop                │
# ╰──────────────────────────────────────────────────────────╯
function ff_background()
{
    cp $(realpath ${GROUPTIME_TEMP_FILE}) ${BG_COPY_TEMP}
    CONFIG_FILE="ff_scale2.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_scale.sh -i $(realpath ${BG_COPY_TEMP}) -o ${BG_SCALE_TEMP} -w 1920 -h 1080 $CONFIG_FLAG
    unset CONFIG_FLAG

    CONFIG_FILE="ff_crop.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_crop.sh -i $(realpath ${BG_SCALE_TEMP}) -o ${BG_CROP_TEMP}  -w 1080 -h 1080 $CONFIG_FLAG
    unset CONFIG_FLAG

    CONFIG_FILE="ff_blur.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_blur.sh -i $(realpath ${BG_CROP_TEMP})  -o ${BG_BLUR_TEMP}  -s 20 $CONFIG_FLAG
    unset CONFIG_FLAG

    CONFIG_FILE="ff_watermark1.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_watermark.sh -i $(realpath ${BG_BLUR_TEMP}) -o ${BG_WATERMARK_TEMP} -w ${GROUPTIME_TEMP_FILE} -x "(W-w)/2" -y "(H-h)/2" -s 0.56 $CONFIG_FLAG
    unset CONFIG_FLAG
}
BG_COPY_TEMP="${TEMP_FOLDER}/temp_BG_copy.mp4"
BG_SCALE_TEMP="${TEMP_FOLDER}/temp_BG_scale.mp4"
BG_CROP_TEMP="${TEMP_FOLDER}/temp_BG_crop.mp4"
BG_BLUR_TEMP="${TEMP_FOLDER}/temp_BG_blur.mp4"
BG_WATERMARK_TEMP="${TEMP_FOLDER}/temp_BG_watermark.mp4"


# ╭──────────────────────────────────────────────────────────╮
# │         Add glyph to bottom right corner of video        │
# ╰──────────────────────────────────────────────────────────╯
function ff_watermark2()
{
    CONFIG_FILE="ff_watermark2.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_watermark.sh -i ${BG_WATERMARK_TEMP} -w ${WATERMARK2} -s 0.2 -x "(W-w)" -y "(H-h)" -o ${WATERMARK2_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}
WATERMARK2_TEMP_FILE="${TEMP_FOLDER}/temp_watermark2.mp4"


# ╭──────────────────────────────────────────────────────────╮
# │                 Add Text to top of video                 │
# ╰──────────────────────────────────────────────────────────╯
function ff_text()
{
    CONFIG_FILE="ff_text.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_text.sh -i ${WATERMARK2_TEMP_FILE} -c "${TEXT_COLOUR}" -s 36 -r 10 -p "${TEXT_BACKGROUND}" -y "(h-th)-100" -o ${TEXT_TEMP_FILE} ${CONFIG_FLAG}
    unset CONFIG_FLAG
}
TEXT_TEMP_FILE="${TEMP_FOLDER}/temp_text.mp4"


# ╭──────────────────────────────────────────────────────────╮
# │               Overlay the isometric image                │
# ╰──────────────────────────────────────────────────────────╯
function ff_watermark3()
{
    CONFIG_FILE="ff_watermark3.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_watermark.sh -i ${TEXT_TEMP_FILE} -w ${WATERMARK3} -s 0.5 -S 0 -E 2 -o ${WATERMARK3_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}
WATERMARK3_TEMP_FILE="${TEMP_FOLDER}/temp_watermark3.mp4"


# ╭──────────────────────────────────────────────────────────╮
# │               Add LondonParkour logo to top              │
# ╰──────────────────────────────────────────────────────────╯
function ff_watermark4()
{
    CONFIG_FILE="ff_watermark4.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_watermark.sh -i ${WATERMARK3_TEMP_FILE} -w ${WATERMARK4} -s 0.25 -x "(W-w)/2" -y 0 -o ${WATERMARK4_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}
WATERMARK4_TEMP_FILE="${TEMP_FOLDER}/temp_watermark4.mp4"


# ╭──────────────────────────────────────────────────────────╮
# │                   Move to output file                    │
# ╰──────────────────────────────────────────────────────────╯
function output_file()
{
    mv ${WATERMARK4_TEMP_FILE} ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME}
    printf "\n\n✅ Appended video created: %s\n" "$OUTPUT_FILENAME"
}

 
# ╭──────────────────────────────────────────────────────────╮
# │                 Create a Thumbnail image                 │
# ╰──────────────────────────────────────────────────────────╯
function ff_thumbnail()
{
    CONFIG_FILE="ff_thumbnail.json"
    OUTPUT_FOLDER=$(realpath $(dirname ${OUTPUT_FILENAME}))
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_thumbnail.sh -i ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME} -o ${OUTPUT_FOLDER}/thumbnail.jpg -c 1 $CONFIG_FLAG
    unset CONFIG_FLAG
    mv ${OUTPUT_FOLDER}/thumbnail-01.jpg ${OUTPUT_FOLDER}/thumbnail.jpg
}


# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    if [[ -z "${FOLDER}" ]]; then 
        printf "❌ No folder specified. Exiting.\n"
        exit 1
    fi

    ff_scale
    ff_grouptime
    ff_background
    ff_watermark2
    ff_text
    ff_watermark3
    ff_watermark4
    output_file
    ff_thumbnail

}


# ╭──────────────────────────────────────────────────────────╮
# │            Config file overrides any settings            │
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

    # Replace the {{FOLDER}} for real folder string

    # Get a list of all the scripts - Any duplicates must have digits after their name. ff_scale1, ff_scale2, etc...
    LIST_OF_SCRIPT_NAMES=$(cat ${CONFIG_FILE} | jq 'to_entries[] | select(.key|startswith("ff")) | .key' | xargs )
    ARRAY_OF_STRING_NAMES=($LIST_OF_SCRIPT_NAMES)

    # Loop through each script settings and create a config file for each one.
    for ff_script_name in "${ARRAY_OF_STRING_NAMES[@]}"
    do
        # Get contents of the settings to insert into the config file.
        SCRIPT_CONTENTS=$(cat ${CONFIG_FILE} | jq --arg SCRIPTNAME "$ff_script_name" 'to_entries[] | select(.key|startswith($SCRIPTNAME)) | .value' )

        # Replace FOLDER_NAME variable in config file
        FOLDER_NAME=$(basename $FOLDER)
        SCRIPT_CONTENTS=${SCRIPT_CONTENTS//FOLDER_NAME/$FOLDER_NAME}

        # Replace FOLDER_TITLE variable in config file
        FOLDER_TITLE=${FOLDER_NAME//_/ }
        SCRIPT_CONTENTS=${SCRIPT_CONTENTS//FOLDER_TITLE/$FOLDER_TITLE}

        # Create temp config files for each section.
        printf "%s\n" "${SCRIPT_CONTENTS}"  > ${TEMP_FOLDER}/temp_config_$ff_script_name.json
    done

}


function cleanup()
{
    rm -f ${TEMP_FOLDER}/temp_*
    rm -f ${LANDSCAPE_TEMP_FILE}
    rm -f ${GROUPTIME_TEMP_FILE}
    rm -f ${GROUPTIME_REVERSED_TEMP_FILE}
    rm -f ${LUT_TEMP_FILE}
    rm -f ${WATERMARK1_TEMP_FILE}
    rm -f ${WATERMARK2_TEMP_FILE}
    rm -f ${STACK_TEMP_FILE}
    rm -f ${CONCAT_TEMP_FILE}
}

cleanup
usage $@
arguments $@
read_config "$@"
main $@
cleanup