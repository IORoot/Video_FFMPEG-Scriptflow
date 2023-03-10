#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                              TEMPLATE : Blurred                              │
# │         Background is a magnified version of main video and Blurred.         │
# │                           Size is 1:1 at 1080x1080                           │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯


printf "🎬 Running $0\n"
printf "🚨 Rule 1. This is just a wrapper for all the './ff_*' scripts. This does not repeat code.\n"
printf "🚨 Rule 2. The input folder must ONLY contain the videos you wish to use.\n"
printf "\n"


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
OUTPUT_FILENAME="processed_blurred.mp4"
LOGLEVEL="error" 
CURRENT_DIRECTORY=$(pwd)
LUT="Circinus.cube"
WATERMARK="./lib/watermarks/youth_class_1080x1080.png"
MAX_WIDTH="848"
MAX_HEIGHT="480"

# ╭──────────────────────────────────────────────────────────╮
# │                     Temporary Files                      │
# ╰──────────────────────────────────────────────────────────╯
TEMP_FOLDER="/tmp"
LANDSCAPE_TEMP_FILE="${TEMP_FOLDER}/temp_landscape.mp4"
GROUPTIME_TEMP_FILE="${TEMP_FOLDER}/temp_grouptime.mp4"
LUT_TEMP_FILE="${TEMP_FOLDER}/temp_lut.mp4"
WATERMARK_TEMP_FILE="${TEMP_FOLDER}/temp_watermark.mp4"

BG_COPY_TEMP="${TEMP_FOLDER}/temp_BG_copy.mp4"
BG_SCALE_TEMP="${TEMP_FOLDER}/temp_BG_scale.mp4"
BG_CROP_TEMP="${TEMP_FOLDER}/temp_BG_crop.mp4"
BG_BLUR_TEMP="${TEMP_FOLDER}/temp_BG_blur.mp4"
BG_WATERMARK_TEMP="${TEMP_FOLDER}/temp_BG_watermark.mp4"


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
# │               Check for any dependencies                 │
# ╰──────────────────────────────────────────────────────────╯
function dependencies()
{
    if ! command -v jq &> /dev/null
    then
        printf "JQ is a dependency and could not be found. Please install JQ for JSON parsing. Exiting.\n"
        exit
    else
        printf "🖇️  JQ found. Continuing.\n"
    fi
}



# ╭──────────────────────────────────────────────────────────╮
# │            Config file overrides any settings            │
# ╰──────────────────────────────────────────────────────────╯
function read_config()
{
    if [ -z ${CONFIG_FILE+x} ]; then return 0; fi
    printf "\n🎛️  Reading Config.\n"

    
    # ff_scale
    # ff_to_landscape
    # ff_grouptime
    # ff_lut
    # ff_background
    # ff_watermark
    # ff_thumbnail
    # ff_text
    # ff_text


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
    printf "\n1️⃣  Rescale big videos.\n"

    for FILE in ${FOLDER}/*
    do
        if [ -d "$FILE" ]; then continue; fi
        if [ ! $(is_movie_file $FILE) ]; then continue; fi

        if [ "${FILE: -4}" == ".mov" ];then

            FILENAME=$(realpath $FILE)
            NO_EXTENSION=${FILENAME%????}

            ../ff_scale.sh -i ${FILENAME} -o ${NO_EXTENSION}.mp4 -w $MAX_WIDTH -h $MAX_HEIGHT

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
    printf "\n2️⃣  Convert portrait videos to landscape.\n"

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
            ../ff_to_landscape.sh -i ${LANDSCAPE_TEMP_FILE} -o $REAL_FILE
            rm ${LANDSCAPE_TEMP_FILE}
        fi

    done
}



# ╭──────────────────────────────────────────────────────────╮
# │               Read folder for input files                │
# ╰──────────────────────────────────────────────────────────╯
function read_input_folder()
{
    printf "\n3️⃣  Read folder for files.\n"
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
    printf "\n4️⃣  Use ff_grouptime.sh to create video of 60sec.\n\n"

    ../ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE}

    ORIGINAL_HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${GROUPTIME_TEMP_FILE})
}



# ╭──────────────────────────────────────────────────────────╮
# │                        Apply LUT                         │
# ╰──────────────────────────────────────────────────────────╯
function ff_lut()
{
    printf "\n5️⃣  Use ff_lut.sh to add colour grading.\n\n"
    ../ff_lut.sh -i $(realpath ${GROUPTIME_TEMP_FILE}) -t ${LUT} -o ${LUT_TEMP_FILE}
}



# ╭──────────────────────────────────────────────────────────╮
# │                Make copy to blur and crop                │
# ╰──────────────────────────────────────────────────────────╯
function ff_background()
{
    printf "\n6️⃣  Make copy, blur and crop.\n\n"
    cp $(realpath ${LUT_TEMP_FILE}) ${BG_COPY_TEMP}
    ../ff_scale.sh -i $(realpath ${BG_COPY_TEMP}) -o ${BG_SCALE_TEMP} -w 1920 -h 1080
    ../ff_crop.sh -i $(realpath ${BG_SCALE_TEMP}) -o ${BG_CROP_TEMP}  -w 1080 -h 1080
    ../ff_blur.sh -i $(realpath ${BG_CROP_TEMP})  -o ${BG_BLUR_TEMP}  -s 20
    ../ff_watermark.sh -i $(realpath ${BG_BLUR_TEMP}) -o ${BG_WATERMARK_TEMP} -w $(realpath ${LUT_TEMP_FILE}) -x "(W-w)/2" -y "(H-h)/2" -s 0.56
}


# ╭──────────────────────────────────────────────────────────╮
# │             Add watermark to bottom of video             │
# ╰──────────────────────────────────────────────────────────╯
function ff_watermark()
{
    printf "\n8️⃣  Use ff_watermark.sh to add the bottom logo.\n\n"
    ../ff_watermark.sh -i ${BG_WATERMARK_TEMP} -w ${WATERMARK} -s 1 -x "(W-w)/2" -y "(H-h)/2" -o ${WATERMARK_TEMP_FILE}
}


# ╭──────────────────────────────────────────────────────────╮
# │                   Move to output file                    │
# ╰──────────────────────────────────────────────────────────╯
function output_file()
{
    mv ${WATERMARK_TEMP_FILE} ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME}
    printf "\n\n✅ Appended video created: %s\n" "$OUTPUT_FILENAME"
}


# ╭──────────────────────────────────────────────────────────╮
# │                 Create a Thumbnail image                 │
# ╰──────────────────────────────────────────────────────────╯
function ff_thumbnail()
{
    # get output folder 
    OUTPUT_FOLDER=$(realpath $(dirname ${OUTPUT_FILENAME}))
    ../ff_thumbnail.sh -i ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME} -o ${OUTPUT_FOLDER}/thumbnail.jpg -c 1
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

    ff_lut

    ff_background

    ff_watermark

    output_file

    ff_thumbnail

}



function cleanup()
{
    rm -f ${LANDSCAPE_TEMP_FILE}
    rm -f ${GROUPTIME_TEMP_FILE}
    rm -f ${LUT_TEMP_FILE}
    rm -f ${WATERMARK_TEMP_FILE}
    rm -f ${BG_COPY_TEMP}
    rm -f ${BG_SCALE_TEMP}
    rm -f ${BG_CROP_TEMP}
    rm -f ${BG_BLUR_TEMP}
    rm -f ${BG_WATERMARK_TEMP}
}

cleanup
dependencies
usage $@
arguments "$@"
read_config "$@"
main $@
cleanup