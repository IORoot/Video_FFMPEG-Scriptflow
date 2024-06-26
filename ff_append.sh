#!/bin/bash
# ╭──────────────────────────────────────────────────────────────────────────────╮
# │                                                                              │
# │            Append two files together with a re-encoding of codecs            │
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
OUTPUT_FILENAME="ff_append.mp4"
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
    if [ "$#" -lt 1 ]; then
        printf "ℹ️ Usage:\n $0 -f <INPUT_FILE> -s <INPUT_FILE> [-o <OUTPUT_FILE>] [-l loglevel]\n\n" >&2 

        printf "Summary:\n"
        printf "This will append two files together while re-encoding them to be the same codec.\n\n"

        printf "Flags:\n"

        printf " -f | --first <FIRST_INPUT_FILE>\n"
        printf "\tThe name of the first input file.\n\n"

        printf " -s | --second <SECOND_INPUT_FILE>\n"
        printf "\tThe name of the second input file.\n\n"

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


        -f|--first)
            FIRST_FILENAME=$(realpath "$2")
            shift
            shift
            ;;


        -s|--second)
            SECOND_FILENAME=$(realpath "$2")
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


        -C|--config)
            CONFIG_FILE="$2"
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
# │   Exit the app by just skipping the ffmpeg processing.   │
# │            Then copy the input to the output.            │
# ╰──────────────────────────────────────────────────────────╯
function exit_gracefully()
{
    cp -f ${INPUT_FILENAME} ${OUTPUT_FILENAME}
    exit 1
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

    # Sen to the arguments function again to override.
    arguments $LIST_OF_INPUTS
}



# ╭──────────────────────────────────────────────────────────╮
# │     Run these checks before you run the main script      │
# ╰──────────────────────────────────────────────────────────╯
function pre_flight_checks()
{
    # Check input filename has been set.
    if [[ -z "${FIRST_FILENAME+x}" ]]; then 
        printf "\t❌ No first file specified. Exiting.\n"
        exit_gracefully
    fi
    if [[ -z "${SECOND_FILENAME+x}" ]]; then 
        printf "\t❌ No second file specified. Exiting.\n"
        exit_gracefully
    fi

    # Check input file exists.
    if [ ! -f "$FIRST_FILENAME" ]; then
        printf "\t❌ First file not found. Exiting.\n"
        exit_gracefully
    fi

    if [ ! -f "$SECOND_FILENAME" ]; then
        printf "\t❌ Second file not found. Exiting.\n"
        exit_gracefully
    fi

    # Check first input filename is a movie file.
    if ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${FIRST_FILENAME}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ First Input file: '%s' not a movie file. Exiting.\n" "${FIRST_FILENAME}"
        ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${FIRST_FILENAME}"
        exit_gracefully
    fi

    # Check first input filename is a movie file.
    if ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${SECOND_FILENAME}" > /dev/null 2>&1; then
        printf "" 
    else
        printf "\t❌ Second Input file: '%s' not a movie file. Exiting.\n" "${SECOND_FILENAME}"
        ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -print_format csv=p=0 "${SECOND_FILENAME}"
        exit_gracefully
    fi
}

function print_flags()
{
    printf "1️⃣  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "FileOne" "$FIRST_FILENAME"
    printf "2️⃣  ${TEXT_GREEN_400}%-10s :${TEXT_RESET} %s\n" "FileTwo" "$SECOND_FILENAME"
}

# ╭──────────────────────────────────────────────────────────╮
# │                                                          │
# │                      Main Function                       │
# │                                                          │
# ╰──────────────────────────────────────────────────────────╯
function main()
{

    pre_flight_checks

    print_flags
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
    ffmpeg -v ${LOGLEVEL} -i ${FIRST_FILENAME} -i ${SECOND_FILENAME} \
        -filter_complex "[0:v] [0:a] [1:v] [1:a] concat=n=2:v=1:a=1 [v] [a]" \
        -map "[v]" -map "[a]" ${OUTPUT_FILENAME}

    printf "✅ ${TEXT_PURPLE_500}%-10s :${TEXT_RESET} %s\n" "Output" "$OUTPUT_FILENAME"

}

usage $@
arguments $@
read_config "$@"
main $@