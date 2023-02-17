#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │               Template : Concatenated Portrait Video add Text                │
# │           (No content-aware editing. clips must total under 60sec)           │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# 

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
TEXT_TOP="YOUTH CLASS"
TEXT_TOP_COLOUR="#000000"
TEXT_TOP_BACKGROUND="#FFFFFF"

TEXT_BOTTOM="londonparkour.com/classes"
TEXT_BOTTOM_COLOUR="#FFFFFF"
TEXT_BOTTOM_BACKGROUND="#E86546"

PADDING_BACKGROUND="#E86546"
OUTPUT_FILENAME="processed_simple_pad.mp4"
LOGLEVEL="error" 
CURRENT_DIRECTORY=$(pwd)
LUT="Circinus.cube"
WATERMARK="ldnpk_white.png"

MAX_WIDTH="848"
MAX_HEIGHT="480"

# ╭──────────────────────────────────────────────────────────╮
# │                     Temporary Files                      │
# ╰──────────────────────────────────────────────────────────╯
TEXT_TOP_TEMP_FILE="temp_text_top.mp4"
TEXT_BOTTOM_TEMP_FILE="temp_text_bottom.mp4"
GROUPTIME_TEMP_FILE="temp_grouptime.mp4"
LUT_TEMP_FILE="temp_lut.mp4"
PAD_TEMP_FILE="temp_pad.mp4"
WATERMARK_TEMP_FILE="temp_watermark.mp4"
LANDSCAPE_TEMP_FILE="temp_landscape.mp4"



# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️  Usage:\n $0 -f <FOLDER> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "🚨 PLEASE NOTE - THIS USES AUTOFLIP - WHICH REQUIRES A GITHUB PAT TO BE DEFINED.\n"
        printf "This is defined as variable GITHUB_AUTOFLIP_PAT and set so the github.com/ioroot/AI__AutoFlip\n"
        printf "Github action can be run via a webhook.\n\n"

        printf "Use on a folder of video clips. Will concat, pad and add text\n\n"

        printf "Flags:\n"

        printf " -f | --folder <FOLDER>\n"
        printf "\tThe path to the folder of video clips.\n\n"

        printf " -t | --texttop \"<TEXT>\"\n"
        printf "\tText to write on top of video.\n\n"

        printf " -b | --textbottom \"<TEXT>\"\n"
        printf "\tText to write on bottom of video.\n\n"

        printf " -p | --pat <PAT>\n"
        printf "\tThe Github Personal Access Token. DEFAULT: GITHUB_AUTOFLIP_PAT.txt\n\n"

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



        -t|--texttop)
            TEXT_TOP="$2"
            shift
            shift
            ;;


        -b|--textbottom)
            TEXT_BOTTOM="$2"
            shift
            shift
            ;;


        -p|--pat)
            GITHUB_AUTOFLIP_PAT="$2"
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
    # │                 Rescale video if too big                 │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n1️⃣  Rescale big videos.\n"

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
    # │         Check each video to convert to landscape         │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n2️⃣  Convert portrait videos to landscape.\n"

    for FILE in ${FOLDER}/*
    do
        if [ -d "$FILE" ]; then continue; fi

        IFS=
        # Measure Height/width against each other
        WIDTH=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=width -of csv=p=0 ${FILE})
        HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${FILE})

        WIDTH=$(echo ${WIDTH} | tr ',' '\n')
        HEIGHT=$(echo ${HEIGHT} | tr ',' '\n')

        # If width is greater than height, it's already landscape.
        if [[ $WIDTH -gt $HEIGHT ]];then
            printf "❌ Already landscape (%sx%s). Skip to next video.\n" "$WIDTH" "$HEIGHT"
        else
            FILENAME=$(realpath $FILE)


            pwd
            ls -la
            cp $FILE ${LANDSCAPE_TEMP_FILE} || true
            sudo cp $FILE ${LANDSCAPE_TEMP_FILE} 
            # mkdir -p $FOLDER/original
            # mv $FILE $FOLDER/original/$(basename $FILE)

            ../ff_to_landscape.sh -i ${LANDSCAPE_TEMP_FILE} -o $FILENAME
        fi

    done


    # ╭──────────────────────────────────────────────────────────╮
    # │               Read folder for input files                │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n3️⃣  Read folder for files.\n"

    INPUT_FILE_LIST=""
    for FILE in ${FOLDER}/*
    do
        ABSOLUTE_PATH=$(realpath ${FILE})
        INPUT_FILE_LIST="${INPUT_FILE_LIST} -i $ABSOLUTE_PATH "
    done



    # ╭──────────────────────────────────────────────────────────╮
    # │              Group videos into single file               │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n4️⃣  Use ff_grouptime.sh to create video of 60sec.\n\n"

    ../ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE}

    ORIGINAL_HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${GROUPTIME_TEMP_FILE})


    # ╭──────────────────────────────────────────────────────────╮
    # │                Run AUTOFLIP Github Action                │
    # ╰──────────────────────────────────────────────────────────╯



    # ╭──────────────────────────────────────────────────────────╮
    # │                        Apply LUT                         │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n5️⃣  Use ff_lut.sh to add colour grading.\n\n"
    ../ff_lut.sh -i $(realpath ${GROUPTIME_TEMP_FILE}) -t ${LUT} -o ${LUT_TEMP_FILE}


    # ╭──────────────────────────────────────────────────────────╮
    # │                      Make video 1:1                      │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n6️⃣  Use ff_pad.sh to make height same as width. 1:1 ratio.\n\n"

    ../ff_pad.sh -i ${LUT_TEMP_FILE} -h iw -c "${PADDING_BACKGROUND}" -o ${PAD_TEMP_FILE}



    # ╭──────────────────────────────────────────────────────────╮
    # │                 Add Text to top of video                 │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n7️⃣  Use ff_text.sh to add the top text.\n\n"
    printf "Addings: %s\n" "${TEXT_TOP}"
    ../ff_text.sh -i ${PAD_TEMP_FILE} -T "${TEXT_TOP}" -c "${TEXT_TOP_COLOUR}" -s 32 -p "${TEXT_TOP_BACKGROUND}" -r 10 -y 60 -o ${TEXT_TOP_TEMP_FILE}

    # ╭──────────────────────────────────────────────────────────╮
    # │             Add watermark to bottom of video             │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n8️⃣  Use ff_watermark.sh to add the bottom logo.\n\n"

    ../ff_watermark.sh -i ${TEXT_TOP_TEMP_FILE}  -w ${WATERMARK} -s 0.25 -x "(W-w)/2" -y "(H-h)" -o ${WATERMARK_TEMP_FILE}

    # ╭──────────────────────────────────────────────────────────╮
    # │               Add text to bottom of video                │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n9️⃣  Use ff_text.sh to add the bottom text.\n\n"

    ../ff_text.sh -i ${WATERMARK_TEMP_FILE} -T "${TEXT_BOTTOM}" -c "${TEXT_BOTTOM_COLOUR}" -s 24 -r 10 -p "${TEXT_BOTTOM_BACKGROUND}" -y "(h-th)-20" -o ${TEXT_BOTTOM_TEMP_FILE}



    # ╭──────────────────────────────────────────────────────────╮
    # │                   Move to output file                    │
    # ╰──────────────────────────────────────────────────────────╯

    mv ${TEXT_BOTTOM_TEMP_FILE} ${CURRENT_DIRECTORY}/${OUTPUT_FILENAME}


    printf "\n\n✅ Appended video created: %s\n" "$OUTPUT_FILENAME"

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
}

cleanup
usage $@
arguments "$@"
main $@
cleanup