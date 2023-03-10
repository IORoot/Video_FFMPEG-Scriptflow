#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │               Template : Concatenated Portrait Video add Text                │
# │           (No content-aware editing. clips must total under 60sec)           │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯
# ff_scale
# ff_to_landscape
# ff_grouptime
# ff_lut
# ff_pad
# ff_text1
# ff_watermark
# ff_text2
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
TEXT_TOP_FILE="text_top.txt"
TEXT_TOP_COLOUR="#FFFFFF"
TEXT_TOP_BACKGROUND="#E86546"

TEXT_BOTTOM_FILE="text_bottom.txt"
TEXT_BOTTOM_COLOUR="#FFFFFF"
TEXT_BOTTOM_BACKGROUND="#E86546"

PADDING_BACKGROUND="#E86546"
OUTPUT_FILENAME="processed_simple_orange.mp4"
LOGLEVEL="error" 
CURRENT_DIRECTORY=$(pwd)
LUT="Circinus.cube"
WATERMARK="./lib/watermarks/ldnpk_white.png"

MAX_WIDTH="848"
MAX_HEIGHT="480"

# ╭──────────────────────────────────────────────────────────╮
# │                     Temporary Files                      │
# ╰──────────────────────────────────────────────────────────╯
TEMP_FOLDER="/tmp"
TEXT_TOP_TEMP_FILE="${TEMP_FOLDER}/temp_text_top.mp4"
TEXT_BOTTOM_TEMP_FILE="${TEMP_FOLDER}/temp_text_bottom.mp4"
GROUPTIME_TEMP_FILE="${TEMP_FOLDER}/temp_grouptime.mp4"
LUT_TEMP_FILE="${TEMP_FOLDER}/temp_lut.mp4"
PAD_TEMP_FILE="${TEMP_FOLDER}/temp_pad.mp4"
WATERMARK_TEMP_FILE="${TEMP_FOLDER}/temp_watermark.mp4"
LANDSCAPE_TEMP_FILE="${TEMP_FOLDER}/temp_landscape.mp4"



# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️  Usage:\n $0 -f <FOLDER> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Github action can be run via a webhook.\n\n"

        printf "Use on a folder of video clips. Will concat, pad and add text\n\n"

        printf "Flags:\n"

        printf " -f | --folder <FOLDER>\n"
        printf "\tThe path to the folder of video clips.\n\n"

        printf " -t | --textfile \"<TEXTFILE>\"\n"
        printf "\tText file with contents to write on top of video.\n\n"

        printf " -b | --textfilebottom \"<TEXTFILE>\"\n"
        printf "\tText file with contents to write on bottom of video.\n\n"

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


        -t|--texttop)
            TEXT_TOP_FILE="$2"
            shift
            shift
            ;;


        -b|--textbottom)
            TEXT_BOTTOM_FILE="$2"
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
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
# │         Check each video to convert to landscape         │
# ╰──────────────────────────────────────────────────────────╯
function ff_to_landscape()
{
    CONFIG_FILE="ff_to_landscape.json"
    for FILE in ${FOLDER}/*
    do
        if [ -d "$FILE" ]; then continue; fi
        if [ ! $(is_movie_file $FILE) ]; then continue; fi

        REAL_FILE=$(realpath $FILE)

        IFS=
        # Measure Height/width against each other
        WIDTH=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=width -of csv=p=0 ${REAL_FILE})
        HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${REAL_FILE})

        WIDTH=$(echo ${WIDTH} | tr ',' '\n')
        HEIGHT=$(echo ${HEIGHT} | tr ',' '\n')

        # If width is greater than height, it's already landscape.
        if [[ $WIDTH -gt $HEIGHT ]];then
            printf "❌ Already landscape (%sx%s). Skip to next video.\n" "$WIDTH" "$HEIGHT"
        else
            mv $REAL_FILE ${LANDSCAPE_TEMP_FILE}
            if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
            ../ff_to_landscape.sh -i ${LANDSCAPE_TEMP_FILE} -o $REAL_FILE $CONFIG_FLAG
            unset CONFIG_FLAG
            rm ${LANDSCAPE_TEMP_FILE}
        fi

    done
}

# ╭──────────────────────────────────────────────────────────╮
# │               Read folder for input files                │
# ╰──────────────────────────────────────────────────────────╯

function read_input_folder()
{
    INPUT_FILE_LIST=""
    for FILE in ${FOLDER}/*
    do
        if [ ! $(is_movie_file $FILE) ]; then continue; fi
        ABSOLUTE_PATH=$(realpath ${FILE})
        INPUT_FILE_LIST="${INPUT_FILE_LIST} -i $ABSOLUTE_PATH "
    done
}


# ╭──────────────────────────────────────────────────────────╮
# │              Group videos into single file               │
# ╰──────────────────────────────────────────────────────────╯
function ff_grouptime()
{
    CONFIG_FILE="ff_grouptime.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
    ORIGINAL_HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${GROUPTIME_TEMP_FILE})

}

# ╭──────────────────────────────────────────────────────────╮
# │                        Apply LUT                         │
# ╰──────────────────────────────────────────────────────────╯
function ff_lut()
{
    CONFIG_FILE="ff_lut.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_lut.sh -i $(realpath ${GROUPTIME_TEMP_FILE}) -t ${LUT} -o ${LUT_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}


# ╭──────────────────────────────────────────────────────────╮
# │                      Make video 1:1                      │
# ╰──────────────────────────────────────────────────────────╯
function ff_pad()
{
    CONFIG_FILE="ff_pad.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_pad.sh -i ${LUT_TEMP_FILE} -h iw -c "${PADDING_BACKGROUND}" -o ${PAD_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}

# ╭──────────────────────────────────────────────────────────╮
# │                 Add Text to top of video                 │
# ╰──────────────────────────────────────────────────────────╯
function ff_text1()
{
    CONFIG_FILE="ff_text1.json"
    if [ -f "${TEXT_TOP_FILE}" ]; then TOP_TEXT_FILE_FLAG="-t $(realpath ${TEXT_TOP_FILE})"; fi
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_text.sh -i ${PAD_TEMP_FILE} $TOP_TEXT_FILE_FLAG -c "${TEXT_TOP_COLOUR}" -s 32 -p "${TEXT_TOP_BACKGROUND}" -r 10 -y 70 -o ${TEXT_TOP_TEMP_FILE} ${CONFIG_FLAG}
    unset CONFIG_FLAG
}

# ╭──────────────────────────────────────────────────────────╮
# │             Add watermark to bottom of video             │
# ╰──────────────────────────────────────────────────────────╯
function ff_watermark()
{
    CONFIG_FILE="ff_watermark.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_watermark.sh -i ${TEXT_TOP_TEMP_FILE}  -w ${WATERMARK} -s 0.25 -x "(W-w)/2" -y "(H-h)" -o ${WATERMARK_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}

# ╭──────────────────────────────────────────────────────────╮
# │               Add text to bottom of video                │
# ╰──────────────────────────────────────────────────────────╯
function ff_text2()
{
    CONFIG_FILE="ff_text2.json"
    if [ -f "${TEXT_BOTTOM_FILE}" ]; then BOTTOM_TEXT_FILE_FLAG="-t $(realpath ${TEXT_BOTTOM_FILE})"; fi
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_text.sh -i ${WATERMARK_TEMP_FILE} ${BOTTOM_TEXT_FILE_FLAG} -c "${TEXT_BOTTOM_COLOUR}" -s 24 -r 10 -p "${TEXT_BOTTOM_BACKGROUND}" -y "(h-th)-20" -o ${TEXT_BOTTOM_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
}

# ╭──────────────────────────────────────────────────────────╮
# │                   Move to output file                    │
# ╰──────────────────────────────────────────────────────────╯
function output_file()
{
    mv ${TEXT_BOTTOM_TEMP_FILE} ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME}
    printf "\n\n✅ video created: %s\n" "$OUTPUT_FILENAME"
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

    # Get a list of all the scripts - Any duplicates must have digits after their name. ff_scale1, ff_scale2, etc...
    LIST_OF_SCRIPT_NAMES=$(cat ${CONFIG_FILE} | jq 'to_entries[] | select(.key|startswith("ff")) | .key' | xargs )
    ARRAY_OF_STRING_NAMES=($LIST_OF_SCRIPT_NAMES)

    # Loop through each script settings and create a config file for each one.
    for ff_script_name in "${ARRAY_OF_STRING_NAMES[@]}"
    do
        # Get contents of the settings to insert into the config file.
        SCRIPT_CONTENTS=$(cat ${CONFIG_FILE} | jq --arg SCRIPTNAME "$ff_script_name" 'to_entries[] | select(.key|startswith($SCRIPTNAME)) | .value' )

        # Create temp config files
        printf "%s\n" "${SCRIPT_CONTENTS}" > ${TEMP_FOLDER}/temp_config_$ff_script_name.json
    done

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
    ff_to_landscape
    read_input_folder
    ff_grouptime
    ff_lut
    ff_pad
    ff_text1
    ff_watermark
    ff_text2
    output_file
    ff_thumbnail

}



function cleanup()
{
    rm -f ${GROUPTIME_TEMP_FILE}
    rm -f ${LUT_TEMP_FILE}
    rm -f ${PAD_TEMP_FILE}
    rm -f ${TEXT_TOP_TEMP_FILE}
    rm -f ${TEXT_BOTTOM_TEMP_FILE}
    rm -f ${WATERMARK_TEMP_FILE}
    rm -f ${LANDSCAPE_TEMP_FILE}
    rm -f ${TEMP_FOLDER}/temp_config_ff*
}

cleanup
usage $@
arguments "$@"
read_config "$@"
main $@
cleanup