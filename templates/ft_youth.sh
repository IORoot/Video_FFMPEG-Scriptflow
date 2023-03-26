#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                              TEMPLATE : Blurred                              │
# │         Background is a magnified version of main video and Blurred.         │
# │                           Size is 1:1 at 1080x1080                           │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯
# Script overrides:
# ff_scale1
# ff_to_landscape
# ff_grouptime
# ff_scale2
# ff_crop
# ff_blur
# ff_watermark
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
OUTPUT_FILENAME="processed_youth.mp4"
LOGLEVEL="error" 
CURRENT_DIRECTORY=$(pwd)
MAX_WIDTH="848"
MAX_HEIGHT="480"

# ╭──────────────────────────────────────────────────────────╮
# │                     Temporary Files                      │
# ╰──────────────────────────────────────────────────────────╯
TEMP_FOLDER="/tmp"



# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️  Usage:\n $0 -f <FOLDER> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "🚨 PLEASE NOTE - THIS USES AUTOFLIP - WHICH REQUIRES A GITHUB PAT TO BE DEFINED.\n"

        printf "Use on a folder of video clips. Will concat, pad and add text\n\n"

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
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n\n"

        printf "List of config.json script names to use:\n"
        printf " - ff_scale1\n"
        printf " - ff_grouptime\n"
        printf " - ff_lut\n"
        printf " - ff_scale2\n"
        printf " - ff_crop\n"
        printf " - ff_blur\n"
        printf " - ff_watermark1\n"
        printf " - ff_watermark2\n"
        printf " - ff_thumbnail\n"

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


        -t|--text)
            # NOT USED IN THIS TEMPLATE
            shift
            shift
            ;;


        -b|--bottomtext)
            # NOT USED IN THIS TEMPLATE
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
    
    echo "test"
    ffprobe -version
    ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${FILE}"

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
    CONFIG_FILE="ff_scale1.json"

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
LANDSCAPE_TEMP_FILE="${TEMP_FOLDER}/temp_landscape.mp4"
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
GROUPTIME_TEMP_FILE="${TEMP_FOLDER}/temp_grouptime.mp4"
function ff_grouptime()
{
    CONFIG_FILE="ff_grouptime.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE} $CONFIG_FLAG
    unset CONFIG_FLAG
    ORIGINAL_HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${GROUPTIME_TEMP_FILE})
}


# ╭──────────────────────────────────────────────────────────╮
# │                Make copy to blur and crop                │
# ╰──────────────────────────────────────────────────────────╯
BG_COPY_TEMP="${TEMP_FOLDER}/temp_BG_copy.mp4"
BG_SCALE_TEMP="${TEMP_FOLDER}/temp_BG_scale.mp4"
BG_CROP_TEMP="${TEMP_FOLDER}/temp_BG_crop.mp4"
BG_BLUR_TEMP="${TEMP_FOLDER}/temp_BG_blur.mp4"
BG_WATERMARK_TEMP="${TEMP_FOLDER}/temp_BG_watermark.mp4"
function ff_background()
{
    cp $(realpath ${GROUPTIME_TEMP_FILE}) ${BG_COPY_TEMP}
    CONFIG_FILE="ff_scale2.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_scale.sh -i $(realpath ${BG_COPY_TEMP}) -o ${BG_SCALE_TEMP} -w 1276 -h 848 $CONFIG_FLAG
    unset CONFIG_FLAG

    CONFIG_FILE="ff_crop.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_crop.sh -i $(realpath ${BG_SCALE_TEMP}) -o ${BG_CROP_TEMP}  -w 848 -h 848 $CONFIG_FLAG
    unset CONFIG_FLAG

    CONFIG_FILE="ff_blur.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_blur.sh -i $(realpath ${BG_CROP_TEMP})  -o ${BG_BLUR_TEMP}  -s 20 $CONFIG_FLAG
    unset CONFIG_FLAG

    CONFIG_FILE="ff_watermark.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_watermark.sh -i $(realpath ${BG_BLUR_TEMP}) -o ${BG_WATERMARK_TEMP} -w ${GROUPTIME_TEMP_FILE} -x "(W-w)/2" -y "(H-h)/2" -s 0.56 $CONFIG_FLAG
    unset CONFIG_FLAG
}


# ╭──────────────────────────────────────────────────────────╮
# │                   Random youth overlay                   │
# ╰──────────────────────────────────────────────────────────╯
OVERLAY_TEMP="${TEMP_FOLDER}/temp_overlay.mp4"
WEBHOST_ADDRESS="http://media.londonparkour.com/overlays"
OVERLAYS_DIRECTORY=$(realpath ./)
OVERLAY="${OVERLAYS_DIRECTORY}/overlay.mov"

LIST_OVERLAYS=(
    "arrows__multi--youth-london-parkour-classes.mov"
    "border__orange--youth-classes.mov"
    "circle__purple--youth-classes.mov"
    "slant__green--youth-parkour-classes.mov"
    "slant__orange--youth-parkour-classes.mov"
    "solidcircle__blue--parkour-youth-classes.mov"
    "triangles__orange--youth-classes.mov"
)
RANDOM=$$$(date +%s)
RANDOM_ARRAY_ENTRY=$[$RANDOM % ${#LIST_OVERLAYS[@]}]
RANDOM_OVERLAY=${LIST_OVERLAYS[${RANDOM_ARRAY_ENTRY}]}

function ff_overlay()
{
    ## download random overlay
    curl --url "${WEBHOST_ADDRESS}/${RANDOM_OVERLAY}" --output ${OVERLAY}

    ## process
    CONFIG_FILE="ff_overlay.json"
    if [ -f "${TEMP_FOLDER}/temp_config_$CONFIG_FILE" ]; then CONFIG_FLAG="-C ${TEMP_FOLDER}/temp_config_$CONFIG_FILE"; fi
    ../ff_overlay.sh -i ${BG_WATERMARK_TEMP} -v ${OVERLAY} -o ${OVERLAY_TEMP} -S 1 -E 11
    unset CONFIG_FLAG
}



# ╭──────────────────────────────────────────────────────────╮
# │                   Move to output file                    │
# ╰──────────────────────────────────────────────────────────╯
function output_file()
{
    mv ${OVERLAY_TEMP} ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME}
    printf "🎬 Video created: %s\n" "$OUTPUT_FILENAME"
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
    ff_to_landscape
    read_input_folder
    ff_grouptime
    ff_background
    ff_overlay
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


function cleanup()
{
    rm -f ${TEMP_FOLDER}/temp_*
}

cleanup
usage $@
arguments "$@"
read_config "$@"
main $@
cleanup