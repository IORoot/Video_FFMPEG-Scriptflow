#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                     Concatenate multiple files together                      │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# links
# https://stackoverflow.com/questions/7333232/how-to-concatenate-two-mp4-files-using-ffmpeg

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

TMP_FILE="/tmp/tmp_ffmpeg_concat_list.txt"                  # define temporary file
OUTPUT_FILENAME=""                                          # define output file
LOGLEVEL="error"                                            # Default FFMPEG loglevel

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯
usage()
{
    if [ "$#" -lt 2 ]; then
        printf "ℹ️ Usage:\n $0 -o <OUTPUT_FILE> -i <INPUT_FILE> -i <INPUT_FILE> [ -i <INPUT_FILE3>...] [-l loglevel]\n\n" >&2 

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tThe name of the output file. Specify only one.\n\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of an input file. Specify as many as you wish.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n"

        exit 1
    fi
}


# ╭──────────────────────────────────────────────────────────╮
# │     Write the absolute path into the temporary file      │
# ╰──────────────────────────────────────────────────────────╯
function write_to_temp()
{
    FILE=$1

    # get absolute path of file.
    REAL_PATH=$(realpath ${FILE})

    # print to screen
    printf "➡️  file: %s\n" "${REAL_PATH}"

    # print line into temp file.
    printf "file '%s'\n" "${REAL_PATH}" >> ${TMP_FILE}
}


function setup()
{
    # delete any existing temp file.
    rm -f ${TMP_FILE} 
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
            write_to_temp $2
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
# ╭──────────────────────────────────────────────────────────╮
# │          Run FFMPEG against the temporary file           │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    printf "⬅️  Output file: %s\n" "${OUTPUT_FILENAME}"

    printf "🚀 Running video concatenation\n"

    # -v error      : Only show errors
    # -f concat     : use filter 'concat'
    # -safe         : enable safe mode 0 (possible values: -1 0 1)
    # -i file       : input file
    # -c copy       : codec to use is 'copy' original.
    # file          : output filename
    ffmpeg -v ${LOGLEVEL} -f concat -safe 0 -i ${TMP_FILE} -c copy ${OUTPUT_FILENAME}

    # cleanup
    rm ${TMP_FILE}

    printf "✅ Done.\n"
}


# Run the main functions passing all parameters in.
usage $@
setup
arguments $@
main $@