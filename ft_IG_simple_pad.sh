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

OUTPUT_FILENAME="processed_simple_pad.mp4"
LOGLEVEL="error" 
GROUPTIME_TEMP_FILE="temp_grouptime.mp4"

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

    printf "1️⃣  Read folder for files.\n"

    INPUT_FILE_LIST=""
    for FILE in ${FOLDER}/*
    do
        INPUT_FILE_LIST="${INPUT_FILE_LIST}-i $FILE "
    done
    # printf "%s\n" "${INPUT_FILE_LIST}"


    printf "2️⃣  Use ff_grouptime.sh to create video of 60sec.\n"

    ./ff_grouptime.sh ${INPUT_FILE_LIST} -d 60 -o ${GROUPTIME_TEMP_FILE}

    printf "✅ Appended video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
main $@