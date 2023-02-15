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
TEXT_BOTTOM="londonparkour.com/classes"
TEXT_COLOUR="#FFFFFF"
TEXT_BACKGROUND="#000000"
PADDING_BACKGROUND="#FFFFFF"
OUTPUT_FILENAME="processed_simple_pad.mp4"
LOGLEVEL="error" 
CURRENT_DIRECTORY=$(pwd)
LUT="/Users/andypearson/Code/ffmpeg_utils/lib/luts/Circinus.cube"
WATERMARK="/Users/andypearson/Code/ffmpeg_utils/lib/watermarks/ldnpk_black_solid.png"

# ╭──────────────────────────────────────────────────────────╮
# │                     Temporary Files                      │
# ╰──────────────────────────────────────────────────────────╯
TEXT_TOP_TEMP_FILE="/tmp/temp_text_top.mp4"
TEXT_BOTTOM_TEMP_FILE="/tmp/temp_text_bottom.mp4"
GROUPTIME_TEMP_FILE="/tmp/temp_grouptime.mp4"
LUT_TEMP_FILE="/tmp/temp_lut.mp4"
PAD_TEMP_FILE="/tmp/temp_pad.mp4"



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
        ABSOLUTE_PATH=$(realpath ${FILE})
        INPUT_FILE_LIST="${INPUT_FILE_LIST}-i $ABSOLUTE_PATH "
    done



    # ╭──────────────────────────────────────────────────────────╮
    # │              Group videos into single file               │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n2️⃣  Use ff_grouptime.sh to create video of 60sec.\n\n"

    ../ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE}

    ORIGINAL_HEIGHT=$(ffprobe -v ${LOGLEVEL} -select_streams v -show_entries stream=height -of csv=p=0 ${GROUPTIME_TEMP_FILE})


    # ╭──────────────────────────────────────────────────────────╮
    # │                Run AUTOFLIP Github Action                │
    # ╰──────────────────────────────────────────────────────────╯



    # ╭──────────────────────────────────────────────────────────╮
    # │                        Apply LUT                         │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n3️⃣  Use ff_lut.sh to add colour grading.\n\n"
    ../ff_lut.sh -i $(realpath ${GROUPTIME_TEMP_FILE}) -t $(realpath ${LUT}) -o ${LUT_TEMP_FILE}


    # ╭──────────────────────────────────────────────────────────╮
    # │                      Make video 1:1                      │
    # ╰──────────────────────────────────────────────────────────╯
    printf "\n4️⃣  Use ff_pad.sh to make height same as width. 1:1 ratio.\n\n"

    ../ff_pad.sh -i ${LUT_TEMP_FILE} -h iw -c "${PADDING_BACKGROUND}" -o ${PAD_TEMP_FILE}



    # ╭──────────────────────────────────────────────────────────╮
    # │                 Add Text to top of video                 │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n5️⃣  Use ff_text.sh to add the top text.\n\n"
    printf "Addings: %s\n" "${TEXT_TOP}"
    ../ff_text.sh -i ${PAD_TEMP_FILE} -T "${TEXT_TOP}" -c "${TEXT_COLOUR}" -s 50 -p "${TEXT_BACKGROUND}" -r 20 -y "((h-${ORIGINAL_HEIGHT})/4)-(th/2)" -o ${TEXT_TOP_TEMP_FILE}

    # ╭──────────────────────────────────────────────────────────╮
    # │             Add watermark to bottom of video             │
    # ╰──────────────────────────────────────────────────────────╯



    # ╭──────────────────────────────────────────────────────────╮
    # │               Add text to bottom of video                │
    # ╰──────────────────────────────────────────────────────────╯

    printf "\n6️⃣  Use ff_text.sh to add the bottom text.\n\n"

    ../ff_text.sh -i ${TEXT_TOP_TEMP_FILE} -T "${TEXT_BOTTOM}" -c "#000000" -s 40 -p "#ffffff" -r 10 -y "(((h-${ORIGINAL_HEIGHT})/4)*3)-(th/2)+${ORIGINAL_HEIGHT}" -o ${TEXT_BOTTOM_TEMP_FILE}






    # ╭──────────────────────────────────────────────────────────╮
    # │                   Copy to output file                    │
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
}

cleanup
usage $@
arguments "$@"
main $@
cleanup