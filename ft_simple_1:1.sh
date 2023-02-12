#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │               Template : Concatenated Portrait Video add Text                │
# │           (No content-aware editing. clips must total under 60sec)           │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# 

printf "🚨 Rule 1. This is just a wrapper for all the '../ff_*' scripts. This does not repeat code.\n"
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
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯


TEXT_COLOUR="#FFFFFF"
TEXT_BACKGROUND="#000000"
PADDING_BACKGROUND="#FFFFFF"

OUTPUT_FILENAME="processed_simple_pad.mp4"
LOGLEVEL="error" 
TEXT_TOP_FILE="text_top.txt"
TEXT_BOTTOM_FILE="text_bottom.txt"

GROUPTIME_TEMP_FILE="temp_grouptime.mp4"
PAD_TEMP_FILE="temp_pad.mp4"
TEXTTOP_TEMP_FILE="temp_texttop.mp4"
TEXTBOTTOM_TEMP_FILE="temp_textbottom.mp4"



# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️  Usage:\n $0 -f <FOLDER> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Use on a folder of video clips. Will concat, pad and add text\n\n"

        printf "Flags:\n"

        printf " -f | --folder <FOLDER>\n"
        printf "\tThe path to the folder of video clips.\n\n"

        printf " -t | --toptextfile <TEXTFILE>\n"
        printf "\tFile containing Text to add onto the top of the video. Default : text_top.txt\n\n"

        printf " -b | --bottomtextfile <TEXTFILE>\n"
        printf "\tFile containing Text to add below the video. DEFAULT: text_bottom.txt\n\n"

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


        -t|--toptextfile)
            TEXT_TOP_FILE="$2"
            shift
            shift
            ;;


        -b|--bottomtextfile)
            TEXT_BOTTOM_FILE="$2"
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
    # │         Check each video to convert to landscape         │
    # ╰──────────────────────────────────────────────────────────╯

    # NOT WORKING - ff_to_landsacpe is not outputting correct file and causing output file to lock up.

    # for FILE in ${FOLDER}/*
    # do
    #     mv $FILE /tmp/temp.mp4
    #     ./ff_to_landscape.sh -i /tmp/temp.mp4 -o $FILE
    #     if [ ! -f "$FILE" ]; then
    #         mv /tmp/temp.mp4 $FILE
    #     fi
    #     rm -f /tmp/temp.mp4
    # done


    # ╭──────────────────────────────────────────────────────────╮
    # │               Read folder for input files                │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n1️⃣  Read folder for files.\n"

    INPUT_FILE_LIST=""
    for FILE in ${FOLDER}/*
    do
        INPUT_FILE_LIST="${INPUT_FILE_LIST}-i $FILE "
    done



    # ╭──────────────────────────────────────────────────────────╮
    # │              Group videos into single file               │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n2️⃣  Use ff_grouptime.sh to create video of 60sec.\n\n"

    ./ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE}

    ORIGINAL_HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${GROUPTIME_TEMP_FILE})




    # ╭──────────────────────────────────────────────────────────╮
    # │                      Make video 1:1                      │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n3️⃣  Use ff_pad.sh to make height same as width. 1:1 ratio.\n\n"

    ./ff_pad.sh -i ${GROUPTIME_TEMP_FILE} -h iw -c "${PADDING_BACKGROUND}" -o ${PAD_TEMP_FILE}




    # ╭──────────────────────────────────────────────────────────╮
    # │           Add Text to top and bottom of video            │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n3️⃣  Use ff_text.sh to add the top text.\n\n"

    ./ff_text.sh -i ${PAD_TEMP_FILE} -t ${TEXT_TOP_FILE} -c "${TEXT_COLOUR}" -s 80 -p "${TEXT_BACKGROUND}" -r 20 -y "((h-${ORIGINAL_HEIGHT})/4)-(th/2)" -o ${TEXTTOP_TEMP_FILE}
    
    ./ff_text.sh -i ${TEXTTOP_TEMP_FILE} -t ${TEXT_BOTTOM_FILE} -c "${TEXT_COLOUR}" -s 40 -p "${TEXT_BACKGROUND}" -r 20 -y "(((h-${ORIGINAL_HEIGHT})/4)*3)-(th/2)+${ORIGINAL_HEIGHT}" -o ${TEXTBOTTOM_TEMP_FILE}

    printf "\n\n✅ Appended video created: %s\n" "$OUTPUT_FILENAME"



    # ╭──────────────────────────────────────────────────────────╮
    # │                        Add a LUT                         │
    # ╰──────────────────────────────────────────────────────────╯

    
}



function cleanup()
{
    rm -f ${GROUPTIME_TEMP_FILE}
    rm -f ${PAD_TEMP_FILE}
    rm -f ${TEXTTOP_TEMP_FILE}
    # rm -f ${TEXTBOTTOM_TEMP_FILE}
}

cleanup
usage $@
arguments $@
main $@
cleanup