#!/bin/bash

# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │                     Concatenate multiple files together                       │
# │                                                                              │
# ╰──────────────────────────────────────────────────────────────────────────────╯

# Note: the FIRST video will set the FPS and dimensions. Make sure they are not different.

# links
# https://stackoverflow.com/questions/7333232/how-to-concatenate-two-mp4-files-using-ffmpeg

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
OUTPUT_FILENAME="ff_concat.mp4"                             
TMP_FILE="/tmp/tmp_ffmpeg_concat_list.txt"                  
LOGLEVEL="error"                                           

function stylesheet()
{
    TEXT_GREEN_400="\e[38;2;74;222;128m"
    TEXT_ORANGE_500="\e[38;2;249;115;22m"
    TEXT_RED_400="\e[38;2;248;113;113m"
    TEXT_BLUE_600="\e[38;2;37;99;235m"
    TEXT_YELLOW_500="\e[38;2;234;179;8m"
    TEXT_PURPLE_500="\e[38;2;168;85;247m"
    TEXT_RESET="\e[39m"
}
stylesheet

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
        printf "\tThe name of an input file or folder. Specify as many as you wish.\n\n"

        printf " -C | --config <CONFIG_FILE>\n"
        printf "\tSupply a config.json file with settings instead of command-line. Requires JQ installed.\n\n"

        printf " -l | --loglevel <LOGLEVEL>\n"
        printf "\tThe FFMPEG loglevel to use. Default is 'error' only.\n"
        printf "\tOptions: quiet,panic,fatal,error,warning,info,verbose,debug,trace\n"

        exit 1
    fi
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

        # use wildcard ? to allow input1, input22,etc...
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
# │     Write the absolute path into the temporary file      │
# ╰──────────────────────────────────────────────────────────╯
function write_to_temp()
{
    FILE=$1


    # If this is a file
    if [ -f "$FILE" ]; then
        # get absolute path of file.
        REAL_PATH=$(realpath ${FILE})

        # print to screen
        printf "📥 ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "Input" "$REAL_PATH"

        # check files
        pre_flight_checks ${FILE}
        
        # print line into temp file.
        printf "file '%s'\n" "${REAL_PATH}" >> ${TMP_FILE}
    fi



    # if this a folder
    if [ -d "$FILE" ]; then

        LOOP=0
        LIST_OF_FILES=$(find $FILE -maxdepth 1 \( -iname '*.mp4' -o -iname '*.mov' \) | grep "$GREP" | sort)
        for FILE in $LIST_OF_FILES
        do
            pre_flight_checks $FILE
            FULL_FILEPATH=$(realpath ${FILE})
            printf "file %s\n" "${FULL_FILEPATH}" >> ${TMP_FILE}
            LOOP=$(expr $LOOP + 1)
        done

    fi
    
}



# ╭──────────────────────────────────────────────────────────╮
# │        Read config-file if supplied. Requires JQ           │
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

    # Sen to the arguments function again to override.
    arguments $LIST_OF_INPUTS
}


# ╭──────────────────────────────────────────────────────────╮
# │   Exit the app by just skipping the ffmpeg processing.   │
# │            Then copy the input to the output.            │
# ╰──────────────────────────────────────────────────────────╯
function exit_gracefully()
{
    exit 0
}

# ╭──────────────────────────────────────────────────────────╮
# │     Run these checks before you run the main script      │
# ╰──────────────────────────────────────────────────────────╯
function pre_flight_checks()
{
    INPUT_FILE=$1

    # Check input file exists.
    if [ ! -f "$INPUT_FILE" ]; then
        printf "\t❌ Input file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check input filename is a movie file.
    if ffprobe "${INPUT_FILE}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ Input file: '%s' not a movie file. Exiting.\n" "${INPUT_FILE}"
        ffprobe "${INPUT_FILE}"
        exit_gracefully
    fi
}




# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
# ╭──────────────────────────────────────────────────────────╮
# │          Run FFMPEG against the temporary file            │
# ╰──────────────────────────────────────────────────────────╯
function main()
{
    # -v error      : Only show errors
    # -f concat     : use filter 'concat'
    # -safe         : enable safe mode 0 (possible values: -1 0 1)
    # -i file        : input file
    # -c copy       : codec to use is 'copy' original.
    # file           : output filename
    ffmpeg -v ${LOGLEVEL} -f concat -safe 0 -i ${TMP_FILE} -c copy ${OUTPUT_FILENAME}

    # cleanup
    rm ${TMP_FILE}

    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"
}


# Run the main functions passing all parameters in.
usage $@
setup
arguments $@
read_config "$@"
main $@