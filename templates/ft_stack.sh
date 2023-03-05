#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                               TEMPLATE : STACK                               │
# │                        One video on top of the other                         │
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
OUTPUT_FILENAME="processed_stack.mp4"
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

LANDSCAPE_TEMP_FILE="${TEMP_FOLDER}/temp_landscape.mp4"

GROUPTIME_TEMP_FILE="${TEMP_FOLDER}/temp_grouptime.mp4"
GROUPTIME_REVERSED_TEMP_FILE="${TEMP_FOLDER}/temp_grouptime_reversed.mp4"

STACK_TEMP_FILE="${TEMP_FOLDER}/temp_stack.mp4"

LUT_TEMP_FILE="${TEMP_FOLDER}/temp_lut.mp4"

WATERMARK_TEMP_FILE="${TEMP_FOLDER}/temp_watermark.mp4"



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


    # ╭──────────────────────────────────────────────────────────╮
    # │         Check each video to convert to landscape         │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n✅ Convert portrait videos to landscape.\n"

    for FILE in ${FOLDER}/*
    do
        if [ -d "$FILE" ]; then continue; fi
        if [[ "$FILE" == *"config.json"* ]]; then continue; fi

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



    # ╭──────────────────────────────────────────────────────────╮
    # │                 Rescale video if too big                 │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n✅ Rescale big videos.\n"

    for FILE in ${FOLDER}/*
    do
        if [ -d "$FILE" ]; then continue; fi

        if [ "${FILE: -4}" == ".mov" ];then

            FILENAME=$(realpath $FILE)
            NO_EXTENSION=${FILENAME%????}

            ../ff_scale.sh -i ${FILENAME} -o ${NO_EXTENSION}.mp4 -w $MAX_WIDTH -h $MAX_HEIGHT

            mkdir -p $FOLDER/original
            mv $FILENAME $(dirname $FILENAME)/original/$(basename $FILENAME)

        fi

    done





    # ╭──────────────────────────────────────────────────────────╮
    # │               Read folder for input files                │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n✅ Use ff_grouptime.sh to create video of 60sec.\n\n"

    INPUT_FILE_LIST=""
    for FILE in ${FOLDER}/*
    do
        ABSOLUTE_PATH=$(realpath ${FILE})
        INPUT_FILE_LIST="${INPUT_FILE_LIST} -i $ABSOLUTE_PATH "
    done
    ../ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE}



    # ╭──────────────────────────────────────────────────────────╮
    # │                      REVERSE ORDER                       │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n✅  Use ff_grouptime.sh to create video of 60sec (reversed).\n\n"

    IFS=$'\n'
    INPUT_FILE_LIST_REVERSED=""
    for FILE in $(ls -1 ${FOLDER}/* | sort -r)
    do
        ABSOLUTE_PATH=$(realpath ${FILE})
        INPUT_FILE_LIST_REVERSED="${INPUT_FILE_LIST_REVERSED} -i $ABSOLUTE_PATH "
    done
    ../ff_grouptime.sh ${INPUT_FILE_LIST_REVERSED} -d 60 -o ${GROUPTIME_REVERSED_TEMP_FILE}



    # ╭──────────────────────────────────────────────────────────╮
    # │                    Stack them videos!                    │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n✅ Use ff_stack.sh to create the grid.\n\n"
    ../ff_stack.sh -i ${GROUPTIME_TEMP_FILE} -i ${GROUPTIME_REVERSED_TEMP_FILE} -v -o ${STACK_TEMP_FILE}



    # # ╭──────────────────────────────────────────────────────────╮
    # # │                        Apply LUT                         │
    # # ╰──────────────────────────────────────────────────────────╯
    printf "\n✅ Use ff_lut.sh to add colour grading.\n\n"
    ../ff_lut.sh -i $(realpath ${STACK_TEMP_FILE}) -t ${LUT} -o ${LUT_TEMP_FILE}



    # ╭──────────────────────────────────────────────────────────╮
    # │             Add watermark to center of video             │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n✅ Use ff_watermark.sh to add the center logo.\n\n"
    ../ff_watermark.sh -i ${STACK_TEMP_FILE} -w ${WATERMARK} -s 0.25 -x "(W-w)/2" -y "(H-h)/2" -o ${WATERMARK_TEMP_FILE}


    # ╭──────────────────────────────────────────────────────────╮
    # │                   Move to output file                    │
    # ╰──────────────────────────────────────────────────────────╯
    mv ${WATERMARK_TEMP_FILE} ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME}
    printf "\n\n✅ Appended video created: %s\n" "$OUTPUT_FILENAME"

    # ╭──────────────────────────────────────────────────────────╮
    # │                 Create a Thumbnail image                 │
    # ╰──────────────────────────────────────────────────────────╯
    ../ff_thumbnail.sh -i ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME} -o ${CURRENT_DIRECTORY}/../processed_video/thumbnail.jpg -c 1
    mv ${CURRENT_DIRECTORY}/../processed_video/thumbnail-01.jpg ${CURRENT_DIRECTORY}/../processed_video/thumbnail.jpg
}



function cleanup()
{
    rm -f ${LANDSCAPE_TEMP_FILE}
    rm -f ${GROUPTIME_TEMP_FILE}
    rm -f ${GROUPTIME_REVERSED_TEMP_FILE}
    rm -f ${LUT_TEMP_FILE}
    rm -f ${WATERMARK_TEMP_FILE}
    rm -f ${STACK_TEMP_FILE}

}

cleanup
usage $@
arguments "$@"
main $@
cleanup