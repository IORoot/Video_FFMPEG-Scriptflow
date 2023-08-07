#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                       Create a stack or grid of videos                       │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# ╭──────────────────────────────────────────────────────────╮
# │                       Set Defaults                       │
# ╰──────────────────────────────────────────────────────────╯

# set -o errexit                                              # If a command fails bash exits.
# set -o pipefail                                             # pipeline fails on one command.
if [[ "${DEBUG-0}" == "1" ]]; then set -o xtrace; fi        # DEBUG=1 will show debugging.


# ╭──────────────────────────────────────────────────────────╮
# │                        VARIABLES                         │
# ╰──────────────────────────────────────────────────────────╯
INPUT_FILENAME="input.mp4"
OUTPUT_FILENAME="ff_stack.mp4"
VERTICAL=''
HORIZONTAL=''
GRID=''
TMP_FILE="/tmp/tmp_ffmpeg_stack_list.txt" 
WIDTH="1920"
HEIGHT="1080"
LOGLEVEL="error" 

# ╭──────────────────────────────────────────────────────────╮
# │                          Usage.                          │
# ╰──────────────────────────────────────────────────────────╯

usage()
{
    if [ "$#" -lt 1 ]; then
        printf "ℹ️ Usage:\n $0 -v -h -g -i <INPUT_FILE> [-w <WIDTH>] [-h <HEIGHT>] [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "Stack or grid multiple videos together. Videos have to be same dimensions.\n\n"

        printf "Flags:\n"

        printf " -v | --vertical\n"
        printf "\tCreates a vertical stack of 2 inputs, one video on top of the other.\n\n"

        printf " -h | --horizontal\n"
        printf "\tCreates a horizontal stack of 2 inputs, one video next to the other.\n\n"

        printf " -g | --grid\n"
        printf "\tCreates a 2x2 stack of four input videos.\n\n"

        printf " -x | --width\n"
        printf "\tOutput width. default 1920.\n\n"

        printf " -y | --height\n"
        printf "\tOutput height. Default 1080.\n\n"

        printf " -i | --input <INPUT_FILE>\n"
        printf "\tThe name of any input files.\n\n"

        printf " -o | --output <OUTPUT_FILE>\n"
        printf "\tDefault is %s\n" "${OUTPUT_FILENAME}"
        printf "\tThe name of the output file.\n\n"


        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

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


        -i|--input|--input?|--input??|--input???)
            write_to_temp $2
            shift
            shift
            ;;


        -o|--output)
            OUTPUT_FILENAME="$2"
            shift 
            shift
            ;;


        -v|--vertical)
            VERTICAL="TRUE"
            shift
            ;;


        -h|--horizontal)
            HORIZONTAL="TRUE"
            shift 
            ;;


        -g|--grid)
            GRID="TRUE"
            shift
            ;;


        -x|--width)
            WIDTH="$2"
            shift 
            shift 
            ;;


        -y|--height)
            HEIGHT="$2"
            shift 
            shift 
            ;;


        -C|--config)
            CONFIG_FILE="$2"
            shift 
            shift
            ;;


        -l|--loglevel)
            LOGLEVEL="$2"
            shift 
            shift
            ;;


        --description)              # IGNORED. used for descriptions in JSON 
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
# │        Read config-file if supplied. Requires JQ         │
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

    # Read file
    LIST_OF_INPUTS=$(cat ${CONFIG_FILE} | jq -r 'to_entries[] | ["--" + .key, .value] | @sh' | xargs) 

    # Print to screen
    printf "🎛️  Config Flags: %s\n" "$LIST_OF_INPUTS"

    # Sen to the arguments function again to override.
    arguments $LIST_OF_INPUTS
}


# ╭──────────────────────────────────────────────────────────╮
# │     Write the absolute path into the temporary file      │
# ╰──────────────────────────────────────────────────────────╯
function write_to_temp()
{

    FILE=$1

    # Exclude folders
    if [ -d "$FILE" ]; then
        return
    fi

    # get absolute path of file.
    REAL_PATH=$(realpath ${FILE})

    # print line into temp file.
    printf "%s\n" "${REAL_PATH}" >> ${TMP_FILE}
}


# ╭──────────────────────────────────────────────────────────╮
# │   Exit the app by just skipping the ffmpeg processing.   │
# │            Then copy the input to the output.            │
# ╰──────────────────────────────────────────────────────────╯
function exit_gracefully()
{
    cp -f ${INPUT_FILENAME} ${OUTPUT_FILENAME}
    exit 0
}


# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    if [[ ! -s "${TMP_FILE}" ]]; then
        printf "❌ No inputs specified. Exiting.\n"
        exit_gracefully
    fi


    printf "📚 ff_stack.sh - Stacking input videos. "

    INPUT_FILE_LIST=""
    while read FILE; do
        ABSOLUTE_PATH=$(realpath ${FILE})
        INPUT_FILE_LIST="${INPUT_FILE_LIST} -i $ABSOLUTE_PATH "
    done < ${TMP_FILE}


    NUMBER_OF_LINES=$(wc -l < ${TMP_FILE} | xargs)


    if [ "${VERTICAL}" == "TRUE" ]; then
        if [ $NUMBER_OF_LINES -lt 2 ]; then
            echo "❌ Not enough inputs, need 2, got ${NUMBER_OF_LINES}. exiting."
            exit_gracefully
        fi
        ffmpeg -y -v ${LOGLEVEL} ${INPUT_FILE_LIST} -filter_complex vstack=inputs=2 ${OUTPUT_FILENAME}
    fi

    if [ "${HORIZONTAL}" == "TRUE" ]; then
        if [ $NUMBER_OF_LINES -lt 2 ]; then
            echo "❌ Not enough inputs, need 2, got ${NUMBER_OF_LINES}. exiting."
            exit_gracefully
        fi
        ffmpeg -y -v ${LOGLEVEL} ${INPUT_FILE_LIST} -filter_complex hstack=inputs=2 ${OUTPUT_FILENAME}
    fi

    if [ "${GRID}" == "TRUE" ]; then
        if [ $NUMBER_OF_LINES -lt 4 ]; then
            echo "❌ Not enough inputs, need 4, got ${NUMBER_OF_LINES}. exiting."
            exit_gracefully
        fi
        ffmpeg -y -v ${LOGLEVEL} ${INPUT_FILE_LIST} -filter_complex "[0:v][1:v][2:v][3:v]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v]" -map "[v]" ${OUTPUT_FILENAME}
    fi

    printf "✅ %s\n" "${OUTPUT_FILENAME}"

}


# ╭──────────────────────────────────────────────────────────╮
# │                         Cleanup                          │
# ╰──────────────────────────────────────────────────────────╯
function cleanup()
{
    rm -f ${TMP_FILE}
}



cleanup
usage $@
arguments $@
read_config "$@"
main $@
cleanup