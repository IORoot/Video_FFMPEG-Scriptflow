#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │            Append two files together with a re-encoding of codecs            │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

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

OUTPUT_FILENAME="output_appended.mp4"
LOGLEVEL="error" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 4 ]; then
        printf "ℹ️ Usage:\n $0 -f <INPUT_FILE> -s <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "This will append two files together while re-encoding them to be the same codec.\n\n"

        printf "Flags:\n"

        printf " -f | --first <FIRST_INPUT_FILE>\n"
        printf "\tThe name of the first input file.\n\n"

        printf " -s | --second <SECOND_INPUT_FILE>\n"
        printf "\tThe name of the second input file.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is output_appended.mp4\n"
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


        -f|--first)
            FIRST_FILENAME="$2"
            shift
            shift
            ;;


        -s|--second)
            SECOND_FILENAME="$2"
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

    printf "This will append the first and second files together while re-encoding them.\n"

    # -i ${FILE0}                   input file1 as index 0
    # -i ${FILE1}                   input file1 as index 1
    # -filter_complex               run filters
    # [0:v]                         use input 0's (v)ideo
    # [0:a]                         use input 0's (a)audio
    # [1:v]                         use input 1's (v)ideo
    # [1:a]                         use input 1's (a)audio
    #
    # concat=n=2                    concatenate with number of segments (2)
    # :v=1:a=1                      specify the number of video & audio streams (from 0) (default 1)
    #
    # [v]                           set ouput of filter-complex video as variable [v]
    # [a]                           set ouput of filter-complex audio as variable [a]
    #
    # -map "[v]"                    map variable [v] to output
    # -map "[a]"                    map variable [a] to output
    # 
    printf "🚀 Re-encoding and 📼 Appending videos\n"
    ffmpeg -v ${LOGLEVEL} -i ${FIRST_FILENAME} -i ${SECOND_FILENAME} \
        -filter_complex "[0:v] [0:a] [1:v] [1:a] concat=n=2:v=1:a=1 [v] [a]" \
        -map "[v]" -map "[a]" ${OUTPUT_FILENAME}

    printf "✅ Appended video created: %s\n" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
main $@